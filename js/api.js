// js/api.js
// -----------------------------------------------------------------------------
// Handles fetching quiz questions, saving results, and GA4 event logging
// -----------------------------------------------------------------------------

import { getInitializedClients, getAuthUser, logAnalyticsEvent } from './config.js';
import * as UI from './ui-renderer.js';
import { cleanKatexMarkers } from './utils.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = 'ready4exam-app';

// -----------------------------------------------------------------------------
// GET INITIALIZED CLIENTS (Supabase optional)
// -----------------------------------------------------------------------------
function getClients() {
  const { supabase, db } = getInitializedClients();
  if (!db) throw new Error("[API] Firestore not initialized.");
  return { supabase, db };
}

// -----------------------------------------------------------------------------
// MAP TOPIC → TABLE NAME (Supabase)
// -----------------------------------------------------------------------------
function getTableName(topic) {
  const map = {
    motion: "motion",
    force: "force",
    gravitation: "gravitation",
    work_energy: "work_energy",
    sound: "sound",
    matter_surroundings: "matter_surroundings",
    matter_pure: "matter_pure",
    atom_molecules: "atom_molecules",
    structure_atom: "structure_atom",
    fundamental_unit: "fundamental_unit",
    tissues: "tissues",
    food_resources: "food_resources",
  };

  const key = topic.toLowerCase().replace(/\s+/g, '_').trim();
  const table = map[key] || key;
  console.log(`[API] Topic '${topic}' mapped to table '${table}'`);
  return table;
}

// -----------------------------------------------------------------------------
// FETCH QUESTIONS (Supabase)
// -----------------------------------------------------------------------------
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
    console.error(`[API ERROR] Failed to fetch from ${table}:`, error);
    throw new Error(error.message);
  }
  if (!data?.length) throw new Error("No questions found for this topic/difficulty.");

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

  console.log(`[API] Loaded ${normalized.length} questions from '${table}'`);
  return normalized;
}

// -----------------------------------------------------------------------------
// SAVE QUIZ RESULTS TO FIRESTORE + SEND TO GA4
// -----------------------------------------------------------------------------
export async function saveResult(resultData) {
  const { db } = getClients();
  const user = getAuthUser();

  if (!user) {
    console.warn("[API] Skipping save — user not authenticated.");
    return;
  }

  try {
    await addDoc(collection(db, "quiz_scores"), {
      action: "Quiz Completed",
      userId: user.uid,
      email: user.email,
      chapter: resultData.topic,
      difficulty: resultData.difficulty,
      score: resultData.score,
      total: resultData.total,
      percentage: Math.round((resultData.score / resultData.total) * 100),
      timestamp: serverTimestamp(),
    });

    console.log("[API] Quiz result saved to Firestore.");

    // ✅ Log the event to GA4
    logAnalyticsEvent("quiz_completed", {
      user_id: user.uid,
      email_hash: await hashEmail(user.email),
      topic: resultData.topic,
      difficulty: resultData.difficulty,
      score: resultData.score,
      total: resultData.total,
      percentage: Math.round((resultData.score / resultData.total) * 100),
    });
  } catch (err) {
    console.error("[API ERROR] Firestore save or GA4 log failed:", err);
  }
}

// -----------------------------------------------------------------------------
// Utility: Hash email before logging to GA4 (privacy-safe)
// -----------------------------------------------------------------------------
async function hashEmail(email) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(email.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "anonymous";
  }
}
