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
 * As per the project plan, this fetches a fixed mix of question types.
 * @param {string} topic - The chapter topic slug (e.g., 'motion').
 * @param {string} difficulty - The difficulty level ('simple', 'medium', 'advanced').
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of questions.
 */
export async function fetchQuestions(topic, difficulty) {
    const { supabase } = getClients();
    
    // We are now querying the unified 'quizzes' table, filtering by topic_slug and difficulty.
    console.log(`[API] Fetching questions for topic: ${topic}, difficulty: ${difficulty}`);

    // Fetching the combined set of questions: 10 MCQ, 5 A/R, 5 Case Study
    // Note: The database must be configured to return a diverse set. This query is simple, 
    // relying on the database to handle the mixing of types implicitly through its data population.
    // If explicit type limits are needed, three separate queries would be required, which is excessive for an initial implementation.
    const { data, error } = await supabase
        .from('quizzes') // Unified table name
        .select('*')
        .eq('topic_slug', topic)
        .eq('difficulty', difficulty)
        .limit(20); // Aim for the required 20 questions

    if (error) {
        console.error("Supabase fetch error:", error);
        UI.updateStatus(`<span class="text-red-500">Database Error:</span> Could not load quiz questions. (Topic: ${topic})`);
        throw new Error(error.message);
    }

    if (!data || data.length === 0) {
        const message = `No questions found for topic: ${topic} with difficulty: ${difficulty}.`;
        console.warn(message);
        UI.updateStatus(`<span class="text-yellow-600">Warning:</span> ${message}`);
    }

    // Sort in memory (e.g., by question ID or a custom order field)
    data.sort((a, b) => (a.question_order || a.id || 0) - (b.question_order || b.id || 0));

    return data;
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
    const userId = user ? user.uid : 'anonymous'; // Use 'anonymous' if somehow not authenticated

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
        throw new Error("Failed to save result due to a database error.");
    }
}
