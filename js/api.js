// js/api.js
import { getInitializedClients, getAuthUser } from './config.js';
import * as UI from './ui-renderer.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Identify app instance
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

function getClients() {
    const { supabase, db } = getInitializedClients();
    if (!supabase || !db) throw new Error("Supabase/Firestore not initialized.");
    return { supabase, db };
}

/**
 * Fetches quiz questions from topic tables (e.g., 'motion') with mix:
 * 10 MCQ + 5 AR + 5 Case.
 */
export async function fetchQuestions(topic, difficulty) {
    const { supabase } = getClients();
    console.log(`[API] Fetching questions for topic: ${topic}, difficulty: ${difficulty}`);

    if (UI?.showStatus) UI.showStatus(`Fetching questions for <b>${topic}</b> (${difficulty})...`);

    // Normalize difficulty capitalization
    const diff = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
    const base = supabase.from(topic);

    // --- 10 MCQ ---
    const { data: mcqData, error: mcqError } = await base
        .select('*')
        .eq('difficulty', diff)
        .eq('question_type', 'MCQ')
        .limit(10);
    if (mcqError) console.error('[API ERROR] MCQ fetch failed:', mcqError);

    // --- 5 AR ---
    const { data: arData, error: arError } = await base
        .select('*')
        .eq('difficulty', diff)
        .eq('question_type', 'AR')
        .limit(5);
    if (arError) console.error('[API ERROR] AR fetch failed:', arError);

    // --- 5 Case ---
    const { data: caseData, error: caseError } = await base
        .select('*')
        .eq('difficulty', diff)
        .eq('question_type', 'Case')
        .limit(5);
    if (caseError) console.error('[API ERROR] Case fetch failed:', caseError);

    const data = [...(mcqData || []), ...(arData || []), ...(caseData || [])];

    if (!data.length) throw new Error('No questions found for this topic/difficulty.');

    if (data.length < 20)
        console.warn(`[API WARNING] Found only ${data.length} questions.`);

    // --- Normalize for renderer ---
    const normalized = data.map((item, index) => ({
        id: item.id,
        text: item.question_text || '',
        scenario_reason: item.scenario_reason_text || '',
        options: {
            A: item.option_a || '',
            B: item.option_b || '',
            C: item.option_c || '',
            D: item.option_d || '',
        },
        correct_answer: item.correct_answer_key || '',
        question_type: item.question_type?.toLowerCase() || 'mcq',
        difficulty: item.difficulty || diff,
        question_order: index + 1,
    }));

    return normalized;
}

/**
 * Save quiz results to Firestore (authenticated users only)
 */
export async function saveResult(resultData) {
    const { db } = getClients();
    const user = getAuthUser();
    if (!user || user.isAnonymous) return console.warn('[API] Skipped save; user not authenticated.');

    const quizScoresCollection = collection(db, `/artifacts/${appId}/users/${user.uid}/quiz_scores`);
    try {
        await addDoc(quizScoresCollection, {
            ...resultData,
            user_id: user.uid,
            timestamp: serverTimestamp(),
        });
        console.log('[API] Quiz result saved successfully.');
    } catch (e) {
        console.error('[API ERROR] Failed to save result:', e);
    }
}
