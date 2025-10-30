// js/api.js
import { getInitializedClients, getAuthUser } from './config.js';
import * as UI from './ui-renderer.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

function getClients() {
  const { supabase, db } = getInitializedClients();
  if (!supabase || !db) throw new Error("Supabase or Firestore not initialized.");
  return { supabase, db };
}

/**
 * Fetches quiz questions from topic-specific table (e.g., motion)
 * with 10 MCQ, 5 AR, 5 Case-based.
 */
export async function fetchQuestions(topic, difficulty) {
  const { supabase } = getClients();
  const diff = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
  console.log(`[API] Fetching ${topic} (${diff})`);

  if (UI?.showStatus) UI.showStatus(`Loading questions for <b>${topic}</b> (${diff})...`);

  const base = supabase.from(topic);

  const [mcq, ar, caseQ] = await Promise.all([
    base.select('*').eq('difficulty', diff).eq('question_type', 'MCQ').limit(10),
    base.select('*').eq('difficulty', diff).eq('question_type', 'AR').limit(5),
    base.select('*').eq('difficulty', diff).eq('question_type', 'Case').limit(5),
  ]);

  const data = [
    ...(mcq.data || []),
    ...(ar.data || []),
    ...(caseQ.data || []),
  ];

  if (!data.length) throw new Error("No questions found for this topic/difficulty.");

  // Normalize format
  const normalized = data.map((q, i) => ({
    id: q.id,
    text: q.question_text || '',
    scenario_reason: q.scenario_reason_text || '',
    options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
    correct_answer: q.correct_answer_key || '',
    question_type: (q.question_type || '').toLowerCase(),
    difficulty: q.difficulty,
    order: i + 1
  }));

  return normalized;
}

/**
 * Save quiz results to Firestore (if user logged in)
 */
export async function saveResult(resultData) {
  const { db } = getClients();
  const user = getAuthUser();
  if (!user || user.isAnonymous) return console.warn('[API] Skipped saving. No auth.');

  const ref = collection(db, `/artifacts/${appId}/users/${user.uid}/quiz_scores`);
  await addDoc(ref, { ...resultData, timestamp: serverTimestamp() });
  console.log("[API] Quiz results saved successfully.");
}
