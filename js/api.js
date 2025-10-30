// js/api.js
import { getInitializedClients, getAuthUser } from './config.js';
import * as UI from './ui-renderer.js';
import { collection, doc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global constant to be used across the app for the app ID
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Helper function to get the Supabase and Firestore clients instance
function getClients() {
    const { supabase, db } = getInitializedClients();
    if (!supabase || !db) {
        throw new Error("Core services (Supabase or Firestore) are not initialized. Check config.js setup.");
    }
    return { supabase, db };
}

/**
 * Fetches quiz questions based on topic and difficulty from the unified 'quizzes' table.
 * Enforces the fixed mix: 10 MCQ, 5 AR, 5 Case-Based (Total 20).
 * Questions are fetched in order (not random) for practice to perfection.
 * @param {string} topic - The chapter topic slug (e.g., 'motion').
 * @param {string} difficulty - The difficulty level ('simple', 'medium', 'advanced').
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of questions.
 */
export async function fetchQuestions(topic, difficulty) {
    const { supabase } = getClients();
    
    console.log(`[API] Fetching questions for topic: ${topic}, difficulty: ${difficulty}`);

    // Define the question mix and respective limits
    const questionMix = [
        { type: 'MCQ', limit: 10 },
        { type: 'AR', limit: 5 }, // Assertion-Reason
        { type: 'Case-Based', limit: 5 },
    ];

    const queries = questionMix.map(mix => {
        return supabase
            .from('quizzes') // Assuming a unified 'quizzes' table for all questions
            .select('*')
            .eq('topic_slug', topic)
            .eq('difficulty', difficulty)
            .eq('question_type', mix.type)
            // Use 'limit' for fixed set, order by 'question_order' or 'id' for non-randomness
            .order('question_order', { ascending: true }) 
            .limit(mix.limit);
    });

    try {
        const results = await Promise.all(queries);
        let allQuestions = [];
        let totalFetched = 0;
        let missingQuestions = [];

        results.forEach((res, index) => {
            if (res.error) {
                console.error(`[API ERROR] Failed to fetch ${questionMix[index].type}:`, res.error);
                throw new Error(`Data fetching failed for ${questionMix[index].type}.`);
            }
            const expectedCount = questionMix[index].limit;
            
            if (res.data.length < expectedCount) {
                 missingQuestions.push(`${questionMix[index].type} (Found: ${res.data.length} / Expected: ${expectedCount})`);
            }
            
            allQuestions.push(...res.data);
            totalFetched += res.data.length;
        });

        if (missingQuestions.length > 0) {
            const message = `Incomplete data: Missing questions for ${missingQuestions.join(', ')}. Total questions: ${totalFetched}.`;
            UI.updateStatus(`<span class="text-yellow-600">Warning:</span> ${message}`);
            console.warn(`[API WARNING] ${message}`);
        }
        
        // Final sort in memory by question_order (if available) to ensure a consistent flow (e.g., 10 MCQ, 5 AR, 5 Case-Based)
        allQuestions.sort((a, b) => (a.question_order || a.id || 0) - (b.question_order || b.id || 0));

        return allQuestions;

    } catch (e) {
        console.error("[API ERROR] Error during quiz data fetching:", e);
        throw new Error("Failed to load quiz data. Check Supabase connection and table structure.");
    }
}

/**
 * Saves the quiz result to Firestore.
 * Path: /artifacts/{__app_id}/users/{userId}/quiz_scores
 * @param {Object} resultData - The quiz result data (score, total, topic, answers, etc.).
 * @returns {Promise<void>}
 */
export async function saveResult(resultData) {
    const { db } = getClients();
    const user = getAuthUser();
    const userId = user ? user.uid : 'anonymous'; 

    // ONLY save if the user is authenticated via Google (non-anonymous)
    if (!user || user.isAnonymous) {
        console.warn("[API] Not saving quiz result. User is not authenticated via Google Sign-In.");
        return;
    }

    // Construct the private Firestore path
    const path = `/artifacts/${appId}/users/${userId}/quiz_scores`;
    const quizScoresCollection = collection(db, path);

    try {
        await addDoc(quizScoresCollection, {
            ...resultData,
            user_id: userId,
            timestamp: serverTimestamp(), // Use server timestamp for accuracy
        });
        console.log(`[API] Quiz result saved successfully for user: ${userId}`);
    } catch (e) {
        console.error("[API ERROR] Failed to save quiz result to Firestore:", e);
        // Note: Do not throw error, as failure to save result should not break the app
    }
}
