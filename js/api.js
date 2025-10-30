// js/api.js
import { getInitializedClients, getAuthUser } from './config.js';
import * as UI from './ui-renderer.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global constant to be used across the app for the app ID
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

function getClients() {
    const { supabase, db } = getInitializedClients();
    if (!supabase || !db) {
        throw new Error("Core services (Supabase or Firestore) are not initialized. Check config.js setup.");
    }
    return { supabase, db };
}

/**
 * Fetches quiz questions based on topic and difficulty from the unified 'quizzes' table.
 * Enforces the 10 MCQ, 5 AR, 5 CASE mix (20 total).
 */
export async function fetchQuestions(topic, difficulty) {
    const { supabase } = getClients();

    console.log(`[API] Fetching questions for topic: ${topic}, difficulty: ${difficulty}`);

    // Use UI.showStatus (the correct exported function in ui-renderer.js)
    if (UI && typeof UI.showStatus === 'function') {
        UI.showStatus(`<p class="text-lg font-semibold text-cbse-blue">Fetching 20 Questions (${difficulty})...</p>`);
    }

    const base = supabase.from('quizzes');

    // It's important to run three separate queries to guarantee non-random fixed sets.
    const { data: mcqData, error: mcqError } = await base
        .select(`id, question_text, options, correct_option_id, final_explanation, question_type, scenario_reason_test, question_order`)
        .eq('topic_slug', topic)
        .eq('difficulty', difficulty)
        .eq('question_type', 'mcq')
        .limit(10);

    if (mcqError) console.error("[API ERROR] MCQ Fetch failed:", mcqError);

    const { data: arData, error: arError } = await base
        .select(`id, question_text, options, correct_option_id, final_explanation, question_type, scenario_reason_test, question_order`)
        .eq('topic_slug', topic)
        .eq('difficulty', difficulty)
        .eq('question_type', 'ar')
        .limit(5);

    if (arError) console.error("[API ERROR] AR Fetch failed:", arError);

    const { data: caseData, error: caseError } = await base
        .select(`id, question_text, options, correct_option_id, final_explanation, question_type, scenario_reason_test, question_order`)
        .eq('topic_slug', topic)
        .eq('difficulty', difficulty)
        .eq('question_type', 'case')
        .limit(5);

    if (caseError) console.error("[API ERROR] Case Fetch failed:", caseError);

    const data = [...(mcqData || []), ...(arData || []), ...(caseData || [])];

    if (data.length < 20) {
        const message = `Found only ${data.length} questions. Expected 20 (10 MCQ, 5 AR, 5 Case).`;
        console.warn(`[API WARNING] ${message}`);
        if (UI && typeof UI.showStatus === 'function') {
            UI.showStatus(`<span class="text-yellow-600">Warning:</span> ${message}`);
        }
    }

    // Sort to ensure deterministic ordering (uses question_order then id)
    data.sort((a, b) => (a.question_order || a.id || 0) - (b.question_order || b.id || 0));

    // Normalize field names to match the client-side expectation (if necessary)
    // e.g., ensure 'text', 'options', 'correct_answer' exist for the UI renderer.
    const normalized = data.map(item => {
        return {
            id: item.id,
            text: item.question_text || item.text || '',
            options: item.options || {},
            correct_answer: item.correct_option_id || null,
            explanation: item.final_explanation || item.scenario_reason_test || '',
            question_type: item.question_type || 'mcq',
            question_order: item.question_order || 0,
            raw: item
        };
    });

    return normalized;
}

/**
 * Saves the quiz result to Firestore.
 */
export async function saveResult(resultData) {
    const { db } = getClients();
    const user = getAuthUser();
    const userId = user ? user.uid : 'anonymous';

    if (!user || user.isAnonymous) {
        console.warn("[API] Not saving quiz result. User is not authenticated via Google Sign-In.");
        return;
    }

    const path = `/artifacts/${appId}/users/${userId}/quiz_scores`;
    const quizScoresCollection = collection(db, path);

    try {
        await addDoc(quizScoresCollection, {
            ...resultData,
            user_id: userId,
            timestamp: serverTimestamp(),
        });
        console.log(`[API] Quiz result saved successfully for user: ${userId}`);
    } catch (e) {
        console.error("[API ERROR] Failed to save quiz result to Firestore:", e);
    }
}
