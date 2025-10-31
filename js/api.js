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

/* -----------------------------------------------------
   MAP CHAPTER IDS → SUPABASE TABLE NAMES
----------------------------------------------------- */
function getTableName(topic) {
  const map = {
    // ⚙️ Physics
    "motion": "motion",
    "force_and_laws_of_motion": "force",
    "gravitation": "gravitation",
    "work_and_energy": "work_energy",
    "sound": "sound",

    // 🧪 Chemistry
    "matter_in_our_surroundings": "matter_surroundings",
    "is_matter_around_us_pure": "matter_pure",
    "atoms_and_molecules": "atoms_molecules",
    "structure_of_the_atom": "structure_atom",

    // 🧬 Biology
    "fundamental_unit_of_life": "fundamental_unit",
    "tissues": "tissues",
    "improvement_in_food_resources": "food_resources",

    // 🏛️ History
    "french_revolution": "french_revolution",
    "socialism_in_europe_and_the_russian_revolution": "socialism_europe",
    "nazism_and_the_rise_of_hitler": "nazism",
    "forest_society_and_colonialism": "forest_society",
    "pastoralists_in_the_modern_world": "pastoralists",

    // 🌏 Geography
    "india_size_and_location": "india_size",
    "physical_features_of_india": "physical_features",
    "drainage": "drainage",
    "climate": "climate",
    "natural_vegetation_and_wildlife": "natural_veg",
    "population": "population",

    // 🏛️ Civics (Political Science)
    "what_is_democracy_why_democracy": "what_is_democracy",
    "constitutional_design": "constitutional_design",
    "electoral_politics": "electoral_politics",
    "working_of_institutions": "working_institutions",
    "democratic_rights": "democratic_rights",

    // 💰 Economics
    "story_of_village_palampur": "village_palampur",
    "people_as_resource": "people_resource",
    "poverty_as_a_challenge": "poverty_challenge",
    "food_security_in_india": "food_security",

    // ➗ Mathematics
    "number_systems": "number_systems",
    "polynomials": "polynomials",
    "coordinate_geometry": "coordinate_geometry",
    "linear_equations_in_two_variables": "linear_equations",
    "introduction_to_euclids_geometry": "euclids_geometry",
    "lines_and_angles": "lines_angles",
    "triangles": "triangles",
    "quadrilaterals": "quadrilaterals",
    "areas_of_parallelograms_and_triangles": "areas_shapes",
    "circles": "circles",
    "constructions": "constructions",
    "herons_formula": "herons_formula",
    "surface_areas_and_volumes": "surface_volumes",
    "statistics": "statistics",
    "probability": "probability"
  };

  const key = topic?.toLowerCase()?.trim()?.replace(/\s+/g, '_') || '';
  const tableName = map[key] || key;
  console.log(`[API] Topic '${topic}' → Table '${tableName}'`);
  return tableName;
}

/* -----------------------------------------------------
   FETCH QUESTIONS
----------------------------------------------------- */
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
    console.error(`[API ERROR] Failed to load from '${table}':`, error);
    UI.showStatus(`<span class="text-red-600 font-semibold">Error loading quiz. Please try again later.</span>`);
    throw error;
  }

  if (!data || data.length === 0) {
    UI.showStatus(`<span class="text-yellow-600 font-semibold">No questions found for this topic/difficulty.</span>`);
    throw new Error("No questions found.");
  }

  const normalized = data.map((q) => ({
    id: q.id,
    text: cleanKatexMarkers(q.question_text || ''),
    options: {
      A: cleanKatexMarkers(q.option_a || ''),
      B: cleanKatexMarkers(q.option_b || ''),
      C: cleanKatexMarkers(q.option_c || ''),
      D: cleanKatexMarkers(q.option_d || ''),
    },
    correct_answer: (q.correct_answer_key || '').trim().toUpperCase(),
    scenario_reason: cleanKatexMarkers(q.scenario_reason_text || ''),
    question_type: (q.question_type || '').trim().toLowerCase(),
  }));

  console.log(`[API] Loaded ${normalized.length} questions from '${table}'.`);
  return normalized;
}

/* -----------------------------------------------------
   SAVE RESULT TO FIRESTORE
----------------------------------------------------- */
export async function saveResult(resultData) {
  const { db } = getClients();
  const user = getAuthUser();

  if (!user) {
    console.warn("[API] Skipping save — user not authenticated.");
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
    console.log(`[API] Quiz result saved for user ${user.uid}`);
  } catch (error) {
    console.error("[API ERROR] Failed to save quiz result:", error);
  }
}
