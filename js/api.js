// js/api.js
import { getInitializedClients, getAuthUser } from './config.js';
import * as UI from './ui-renderer.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Global constant for app identification (e.g., project or deployment ID)
 */
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

/**
 * Helper: Retrieve initialized Supabase + Firestore clients
 */
function getClients() {
    const { supabase, db } = getInitializedClients();
    if (!supabase || !db) {
        throw new Error("[API] Core services (Supabase or Firestore) are not initialized. Check config.js setup.");
    }
    return { supabase, db };
}

/**
 * Fetches quiz questions from topic-specific tables.
 * Each topic (e.g., 'motion', 'force') has its own table.
 * Guarantees the expected mix: 10 MCQ, 5 AR, 5 CASE.
 */
export async function fetchQuestions(topic, difficulty) {
    const { supabase } = getClients();
    const tableName = topic.toLowerCase().trim();

    console.log(`[API] Fetching from Supabase table: '${tableName}', difficulty: '${difficulty}'`);

    if (UI?.showStatus) {
        UI.showStatus(`<p class="text-lg font-semibold text-cbse-blue">
            Loading questions for <strong>${topic}</strong> (${difficulty})...
        </p>`);
    }

    // Helper to query one question type safely
    async function fetchByType(type, limit) {
        const { data, error } = await supabase
            .from(tableName)
            .select(`id, question_text, question_type, scenario_reason_text,
                     option_a, option_b, option_c, option_d, correct_answer_key`)
            .eq('difficulty', difficulty)
            .eq('question_type', type)
            .limit(limit);

        if (error) {
            console.error(`[API ERROR] ${type.toUpperCase()} Fetch failed from ${tableName}:`, error);
            return [];
        }
        return data || [];
    }

    // Fetch MCQ (10), AR (5), Case (5)
    const [mcqData, arData, caseData] = await Promise.all([
        fetchByType('mcq', 10),
        fetchByType('ar', 5),
        fetchByType('case', 5),
    ]);

    const allData = [...mcqData, ...arData, ...caseData];

    if (allData.length === 0) {
        console.error(`[API CRITICAL] No questions found in table '${tableName}' for difficulty '${difficulty}'.`);
        if (UI?.showStatus) {
            UI.showStatus(`<span class="text-red-600 font-semibold">
                No questions found for this topic/difficulty.
            </span>`);
        }
        throw new Error("No questions found for this topic/difficulty.");
    }

    if (allData.length < 20) {
        console.warn(`[API WARNING] Found only ${allData.length} questions. Expected 20 (10 MCQ, 5 AR, 5 Case).`);
        if (UI?.showStatus) {
            UI.showStatus(`<span class="text-yellow-600">
                Warning: Found only ${allData.length} questions (Expected 20)
            </span>`);
        }
    }

    // Normalize into the structure expected by ui-renderer.js
    const normalized = allData.map((q, idx) => ({
        id: q.id,
        text: q.question_text,
        options: {
            A: q.option_a,
            B: q.option_b,
            C: q.option_c,
            D: q.option_d
        },
        correct_answer: q.correct_answer_key,
        explanation: q.scenario_reason_text || '',
        question_type: q.question_type || 'mcq',
        question_order: idx + 1,
    }));

    console.log(`[API] Retrieved ${normalized.length} questions from '${tableName}'.`);
    return normalized;
}

/**
 * Saves the quiz result to Firestore under the authenticated user.
 */
export async function saveResult(resultData) {
    const { db } = getClients();
    const user = getAuthUser();
    const userId = user ? user.uid : 'anonymous';

    if (!user || user.isAnonymous) {
