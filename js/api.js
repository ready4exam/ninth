// js/api.js
import { getInitializedClients, getAuthUser } from './config.js';
import * as UI from './ui-renderer.js';
import { cleanKatexMarkers } from './utils.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

function getClients() {
  const { supabase, db } = getInitializedClients();
  if (!supabase || !db) throw new Error("[API] Core services not initialized.");
  return { supabase, db };
}

/**
 * Fetches quiz questions from the topic-specific table.
 * Each table corresponds to a topic (e.g., 'motion').
 */
export async function fetchQuestions(topic, difficulty) {
  const { supabase } = getClients();
  const tableName = topic.toLowerCase().trim();

  console.log(`[API] Fetching questions from '${tableName}' for difficulty '${difficulty}'`);

  UI?.showStatus?.(
    `<p class="text-lg font-semibold text-cbse-blue">
      Loading questions for <strong>${topic}</strong> (${difficulty})...
    </p>`
  );

  const normalizedDifficulty =
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();

  async function fetchByType(type, limit) {
    const normalizedType = type.toUpperCase();
    const { data, error } = await supabase
      .from(tableName)
      .select(
        `id, question_text, question_type, scenario_reason_text,
         option_a, option_b, option_c, option_d, correct_answer_key`
      )
      .eq('difficulty', normalizedDifficulty)
      .eq('question_type', normalizedType)
      .limit(limit);

    if (error) {
      console.error(`[API ERROR] Fetch failed (${type}):`, error);
      return [];
    }
    return data || [];
  }

  // Fetch a fixed ratio of question types
  const [mcqData, arData, caseData] = await Promise.all([
    fetchByType('MCQ', 10),
    fetchByType('AR', 5),
    fetchByType('Case', 5)
  ]);

  const allData = [...mcqData, ...arData, ...caseData];

  if (allData.length === 0) {
    console.error(`[API] No data found for ${topic}/${difficulty}.`);
    UI?.showStatus?.(`<span class="text-red-600 font-semibold">
      No questions found for this topic/difficulty.
    </span>`);
    throw new Error("No questions found for this topic/difficulty.");
  }

  // Normalize + clean question data for engine
  const normalized = allData.map((q, idx) => {
    const type = (q.question_type || '').trim().toLowerCase();
    return {
      id: q.id,
      text: cleanKatexMarkers(q.question_text),
      options: {
        A: cleanKatexMarkers(q.option_a),
        B: cleanKatexMarkers(q.option_b),
        C: cleanKatexMarkers(q.option_c),
        D: cleanKatexMarkers(q.option_d),
      },
      correct_answer: (q.correct_answer_key || '').trim().toUpperCase(),
      explanation:
        type === 'ar' || type === 'case'
          ? cleanKatexMarkers(q.scenario_reason_text || '')
          : '',
      question_type: type,
      question_order: idx + 1,
    };
  });

  console.log(`[API] Retrieved ${normalized.length} questions from '${tableName}'.`);
  return normalized;
}

/**
 * Saves quiz results to Firestore.
 */
export async function saveResult(resultData) {
  const { db } = getClients();
  const user = getAuthUser();
  const userId = user ? user.uid : 'anonymous';

  if (!user || user.isAnonymous) {
    console.warn("[API] Skipping save — user not authenticated.");
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
    console.log(`[API] Quiz result saved successfully for ${userId}`);
  } catch (error) {
    console.error("[API ERROR] Failed to save quiz result:", error);
  }
}
