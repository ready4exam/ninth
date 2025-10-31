// js/api.js
import { getInitializedClients, getAuthUser } from './config.js';
import * as UI from './ui-renderer.js';
import { cleanKatexMarkers } from './utils.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = 'ready4exam-app';

function getClients() {
  const { supabase, db } = getInitializedClients();
  return { supabase, db };
}

export async function fetchQuestions(topic, difficulty) {
  const { supabase } = getClients();
  const table = topic.toLowerCase();

  UI.showStatus(`Loading questions for ${topic} (${difficulty})...`, 'text-blue-600');

  const normalizedDiff = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
  const { data, error } = await supabase
    .from(table)
    .select(`id, question_text, question_type, scenario_reason_text,
             option_a, option_b, option_c, option_d, correct_answer_key`)
    .eq('difficulty', normalizedDiff);

  if (error || !data?.length) {
    UI.showStatus("No questions found.", 'text-red-600');
    throw new Error("No questions available");
  }

  const normalized = data.map((q, i) => ({
    id: q.id,
    text: cleanKatexMarkers(q.question_text),
    options: {
      A: cleanKatexMarkers(q.option_a),
      B: cleanKatexMarkers(q.option_b),
      C: cleanKatexMarkers(q.option_c),
      D: cleanKatexMarkers(q.option_d),
    },
    correct_answer: q.correct_answer_key?.trim().toUpperCase(),
    scenario_reason: cleanKatexMarkers(q.scenario_reason_text || ''),
    question_type: (q.question_type || '').toLowerCase(),
  }));

  console.log(`[API] Loaded ${normalized.length} questions.`);
  return normalized;
}

export async function saveResult(result) {
  const { db } = getClients();
  const user = getAuthUser();
  if (!user) return console.warn("[API] Skipped save (no user).");

  try {
    await addDoc(collection(db, `/results/${appId}/users/${user.uid}/scores`), {
      ...result,
      user_id: user.uid,
      timestamp: serverTimestamp(),
    });
    console.log("[API] Result saved.");
  } catch (e) {
    console.error("[API] Save failed:", e);
  }
}
