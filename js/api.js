// js/api.js
import { getInitializedClients, getAuthUser, logAnalyticsEvent } from './config.js';
import * as UI from './ui-renderer.js';
import { cleanKatexMarkers } from './utils.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = 'ready4exam-app';

function getClients() {
  const { supabase, db } = getInitializedClients();
  // supabase may be null if credentials missing
  if (!db) throw new Error("[API] Firestore (db) not initialized.");
  return { supabase, db };
}

function getTableName(topic) {
  const map = {
    // Physics
    motion: "motion",
    force: "force",
    force_and_laws_of_motion: "force",
    gravitation: "gravitation",
    work_energy: "work_energy",
    work_and_energy: "work_energy",
    sound: "sound",
    // Chemistry
    matter_surroundings: "matter_surroundings",
    matter_in_our_surroundings: "matter_surroundings",
    matter_pure: "matter_pure",
    is_matter_around_us_pure: "matter_pure",
    atoms_molecules: "atom_molecules",
    atom_molecules: "atom_molecules",
    structure_atom: "structure_atom",
    structure_of_the_atom: "structure_atom",
    // Biology (if you added)
    tissues: "tissues",
    fundamental_unit: "fundamental_unit",
    food_resources: "food_resources"
  };

  const key = (topic || "").toLowerCase().replace(/\s+/g, '_').trim();
  return map[key] || key;
}

export async function fetchQuestions(topic, difficulty) {
  const { supabase } = getClients();
  if (!supabase) {
    UI.showStatus("Supabase not configured on this environment.", 'text-red-600');
    throw new Error("Supabase not initialized.");
  }

  const table = getTableName(topic);
  UI.showStatus(`Loading questions for <b>${topic}</b> (${difficulty})...`, 'text-blue-600');

  const normalizedDiff = difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase() : '';

  const { data, error } = await supabase
    .from(table)
    .select(`
      id, question_text, question_type, scenario_reason_text,
      option_a, option_b, option_c, option_d, correct_answer_key
    `)
    .eq('difficulty', normalizedDiff);

  if (error) {
    console.error(`[API ERROR] Supabase fetch failed from '${table}':`, error);
    throw new Error(error.message || "Failed to load questions.");
  }

  if (!data || data.length === 0) {
    throw new Error("No questions found.");
  }

  const normalized = data.map((q) => ({
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

export async function saveResult(resultData) {
  const { db } = getClients();
  const user = getAuthUser();
  if (!user) return console.warn("[API] Not saving result — user not authenticated.");

  try {
    const payload = {
      action: "quiz_completed",
      user_id: user.uid,
      email: user.email || null,
      classId: resultData.classId || null,
      subject: resultData.subject || null,
      topic: resultData.topic || null,
      difficulty: resultData.difficulty || null,
      score: resultData.score,
      total: resultData.total,
      percentage: Math.round((resultData.score / resultData.total) * 100),
      user_answers: resultData.user_answers || null,
      timestamp: serverTimestamp(),
    };

    await addDoc(collection(db, `results/${appId}/scores`), payload);
    console.log("[API] Quiz result saved to Firestore.");

    // GA4 Logging — safe wrapper
    logAnalyticsEvent("quiz_completed", {
      user_id: user.uid,
      topic: resultData.topic,
      difficulty: resultData.difficulty,
      score: resultData.score,
      total: resultData.total,
      percentage: payload.percentage,
    });
  } catch (err) {
    console.error("[API ERROR] Firestore save failed:", err);
  }
}
