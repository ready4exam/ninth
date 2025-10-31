// js/api.js
import { getInitializedClients, getAuthUser } from './config.js';
import * as UI from './ui-renderer.js';
import { cleanKatexMarkers } from './utils.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = 'ready4exam-app';

function getClients() {
  const { supabase, db } = getInitializedClients();
  if (!supabase || !db) throw new Error("[API] Core services not initialized.");
  return { supabase, db };
}

/**
 * Maps quiz topics to their actual Supabase table names.
 * Ensures the correct table is used for each chapter.
 */
function getTableName(topic) {
  const map = {
    // 🧪 Chemistry
    "matter_surroundings": "matter_surroundings",          // Chapter 1 - Matter in our surroundings
    "matter_pure": "matter_pure",                          // Chapter 2 - Is Matter Around us Pure
    "atom_molecules": "atom_molecules",                    // Chapter 3 - Atoms and Molecules
    "structure_atom": "structure_atom",                    // Chapter 4 - Structure of the Atom

    // ⚙️ Physics
    "motion": "motion",                                    // Chapter 7 - Motion
    "force": "force",                                      // Chapter 8 - Force and Laws of Motion
    "gravitation": "gravitation",                          // Chapter 9 - Gravitation
    "work_energy": "work_energy",                          // Chapter 10 - Work and Energy
    "sound": "sound",                                      // Chapter 11 - Sound
  };

  const key = topic.toLowerCase().trim();
  return map[key] || key; // fallback if new table is added later
}

/**
 * Fetches quiz questions for a given topic and difficulty.
 * Compatible with all chapter tables.
 */
export async function fetchQuestions(topic, difficulty) {
  const { supabase } = getClients();
  const table = getTableName(topic);

  UI.showStatus(`Loading questions for <b>${topic}</b> (${difficulty})...`, 'text-blue-600');

  const normalizedDiff = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();

  const { data, error } = await supabase
    .from(table)
    .select(`
      id, question_text, question_type, scenario_reason_text,
      option_a, option_b, option_c, option_d, correct_answer_key
    `)
    .eq('difficulty', normalizedDiff);

  if (error) {
    console.error(`[API ERROR] Fetch failed from '${table}':`, error);
    UI.showStatus(`<span class="text-red-600 font-semibold">Failed to load questions. Please try again later.</span>`);
    throw error;
  }

  if (!data || data.length === 0) {
    console.warn(`[API WARNING] No questions found for '${table}' (${normalizedDiff}).`);
    UI.showStatus(`<span class="text-yellow-600 font-semibold">No questions found for this topic/difficulty.</span>`);
    throw new Error("No questions found.");
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
    correct_answer: (q.correct_answer_key || '').trim().toUpperCase(),
    scenario_reason: cleanKatexMarkers(q.scenario_reason_text || ''),
    question_type: (q.question_type || '').trim().toLowerCase(),
  }));

  console.log(`[API] Loaded ${normalized.length} questions from '${table}'.`);
  return normalized;
}

/**
 * Saves quiz results to Firestore.
 * Works for signed-in users only (Google Auth).
 */
export async function saveResult(resultData) {
  const { db } = getClients();
  const user = getAuthUser();
  if (!user) {
    console.warn("[API] Skipped save — no authenticated user.");
    return;
  }

  const path = `/results/${appId}/users/${user.uid}/scores`;
  const collectionRef = collection(db, path);

  try {
    await addDoc(collectionRef, {
      ...resultData,
      user_id: user.uid,
      timestamp: serverTimestamp(),
    });
    console.log(`[API] Quiz result saved for user: ${user.uid}`);
  } catch (error) {
    console.error("[API ERROR] Failed to save quiz result:", error);
  }
}
