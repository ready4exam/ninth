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
 * **NEW:** Strictly enforces the 10 MCQ, 5 AR, 5 Case-Based mix (Total 20 questions).
 * @param {string} topic - The chapter topic slug (e.g., 'motion').
 * @param {string} difficulty - The difficulty level ('simple', 'medium', 'advanced').
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of questions.
 */
export async function fetchQuestions(topic, difficulty) {
    const { supabase } = getClients();
    
    // We are now querying the unified 'quizzes' table, filtering by topic_slug and difficulty.
    console.log(`[API] Fetching questions for topic: ${topic}, difficulty: ${difficulty}`);

    UI.updateStatus(`<p class="text-lg font-semibold text-cbse-blue">Fetching 20 Questions (${difficulty})...</p>`);
    
    const baseQuery = supabase
        .from('quizzes')
        .select(`
            id, question_text, options, correct_option_id, final_explanation,
            question_type, scenario_reason_test, question_order
        `)
        .eq('topic_slug', topic)
        .eq('difficulty', difficulty);

    // --- Enforce Fixed Question Mix ---
    
    // 1. Fetch 10 MCQ questions
    const { data: mcqData, error: mcqError } = await baseQuery
        .eq('question_type', 'mcq')
        .limit(10);
        
    if (mcqError) console.error("[API ERROR] MCQ Fetch failed:", mcqError);
        
    // 2. Fetch 5 Assertion-Reason (AR) questions
    const { data: arData, error: arError } = await baseQuery
        .eq('question_type', 'ar')
        .limit(5);
        
    if (arError) console.error("[API ERROR] AR Fetch failed:", arError);

    // 3. Fetch 5 Case-Based questions
    const { data: caseData, error: caseError } = await baseQuery
        .eq('question_type', 'case')
        .limit(5);
        
    if (caseError) console.error("[API ERROR] Case Fetch failed:", caseError);

    // Combine and check for errors
    const data = [...(mcqData || []), ...(arData || []), ...(caseData || [])];
    
    // Check if total question count is less than expected 20
    if (data.length < 20) {
         const message = `Found only ${data.length} questions. Expected 20 (10 MCQ, 5 AR, 5 Case).`;
         console.warn(`[API WARNING] ${message}`);
         UI.updateStatus(`<span class="text-yellow-600">Warning:</span> ${message}`);
    }

    // Sort in memory (e.g., by question ID or a custom order field)
    // We rely on the Supabase query to provide a consistent (non-random) set for the fixed 20 questions.
    // The client-side sort provides a stable display order.
    data.sort((a, b) => (a.question_order || a.id || 0) - (b.question_order || b.id || 0));

    return data;
}

/**
 * Saves the quiz result to Firestore.
 * Path: /artifacts/{__app_id}/users/{userId}/quiz_scores
 * @param {Object} resultData - The quiz result data (score, total, topic, answers, etc.).
 * @returns {Promise<void>}\
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
        // Ensure all parameters are included in the saved document
        await addDoc(quizScoresCollection, {
            ...resultData,
            user_id: userId,
            timestamp: serverTimestamp(), // Use server timestamp for accuracy
        });
        console.log(`[API] Quiz result saved successfully for user: ${userId}`);
    } catch (e) {
        console.error("[API ERROR] Failed to save quiz result to Firestore:", e);
    }
}
