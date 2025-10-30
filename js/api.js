// js/api.js
// -----------------------------------------------------------------------------
// Responsible for fetching questions from Supabase and saving results to Firestore.
// Implements exact CBSE Quiz logic (10 MCQ, 5 AR, 5 Case) and LaTeX cleanup.
// -----------------------------------------------------------------------------

import { getInitializedClients, getAuthUser } from './config.js';
import * as UI from './ui-renderer.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { cleanLatex } from './utils.js'; // ✅ import the text-cleaning helper

// Global constant for app ID
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

function getClients() {
    const { supabase, db } = getInitializedClients();
    if (!supabase || !db) {
        throw new Error("[API] Core services (Supabase or Firestore) not initialized. Check config.js setup.");
    }
    return { supabase, db };
}

/**
 * Fetches quiz questions for a topic & difficulty.
 * Guarantees a fixed mix: 10 MCQ + 5 AR + 5 Case-Based = 20 total.
 * Dynamically picks the table based on the topic slug (e.g. 'motion').
 */
export async function fetchQuestions(topic, difficulty) {
    const { supabase } = getClients();

    console.log(`[API] Fetching questions for topic: ${topic}, difficulty: ${difficulty}`);

    if (UI && typeof UI.showStatus === 'function') {
        UI.showStatus(`<p class="text-lg font-semibold text-cbse-blue">Fetching 20 Questions (${difficulty})...</p>`);
    }

    // 🔹 Determine which table to use
    const tableName = topic.toLowerCase();

    // 🔹 Fixed question mix
    const mix = [
        { type: 'mcq', limit: 10 },
        { type: 'ar', limit: 5 },
        { type: 'case', limit: 5 }
    ];

    let allQuestions = [];

    for (const { type, limit } of mix) {
        const { data, error } = await supabase
            .from(tableName)
            .select(`
                id,
                question_text,
                scenario_reason_text,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_answer_key,
                question_type,
                difficulty
            `)
            .eq('difficulty', difficulty)
            .eq('question_type', type)
            .limit(limit);

        if (error) {
            console.error(`[API ERROR] ${type.toUpperCase()} Fetch failed:`, error);
            continue;
        }

        if (data && data.length > 0) {
            allQuestions.push(...data);
        }
    }

    // 🧮 Check mix completeness
    if (allQuestions.length < 20) {
        const message = `Found only ${allQuestions.length} questions. Expected 20 (10 MCQ, 5 AR, 5 Case).`;
        console.warn(`[API WARNING] ${message}`);
        if (UI && typeof UI.showStatus === 'function') {
            UI.showStatus(`<span class="text-yellow-600">${message}</span>`);
        }
    }

    // 🧼 Clean and normalize all question data
    const normalized = allQuestions.map(q => ({
        id: q.id,
        question_text: cleanLatex(q.question_text),
        question_type: q.question_type || 'mcq',
        scenario_reason_test: cleanLatex(q.scenario_reason_text || ''),
        options: [
            { key: 'A', text: cleanLatex(q.option_a) },
            { key: 'B', text: cleanLatex(q.option_b) },
            { key: 'C', text: cleanLatex(q.option_c) },
            { key: 'D', text: cleanLatex(q.option_d) }
        ],
        correct_answer_key: q.correct_answer_key,
        difficulty: q.difficulty
    }));

    console.log(`[API] Retrieved ${normalized.length} questions from ${tableName}.`);
    return normalized;
}

/**
 * Saves quiz result to Firestore.
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
