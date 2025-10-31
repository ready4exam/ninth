// js/quiz-engine.js
// -----------------------------------------------------------------------------
// Core quiz logic: question rendering, navigation, submission
// This version assumes authentication is handled by quiz-engine.html
// -----------------------------------------------------------------------------

import { initializeServices, getAuthUser } from "./config.js";
import { fetchQuestions, saveResult } from "./api.js";
import * as UI from "./ui-renderer.js";

// Global state
let quizState = {
  classId: null,
  subject: null,
  topicSlug: null,
  difficulty: null,
  questions: [],
  currentQuestionIndex: 0,
  userAnswers: {},
  isSubmitted: false,
  score: 0,
};

/**
 * Parse quiz parameters from URL
 */
function parseUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  quizState.classId = urlParams.get("class");
  quizState.subject = urlParams.get("subject");
  quizState.topicSlug = urlParams.get("topic");
  quizState.difficulty = urlParams.get("difficulty");

  if (!quizState.topicSlug) throw new Error("Missing topic parameter.");
  UI.updateHeader(quizState.topicSlug, quizState.difficulty);
}

/**
 * Render question
 */
function renderQuestion() {
  const q = quizState.questions[quizState.currentQuestionIndex];
  if (!q) {
    UI.showStatus("<span>No question to display.</span>");
    return;
  }

  UI.renderQuestion(q, quizState.currentQuestionIndex, quizState.userAnswers[q.id], quizState.isSubmitted);

  const els = UI.getElements?.() || {};
  if (els.counter)
    els.counter.textContent = `${quizState.currentQuestionIndex + 1} / ${quizState.questions.length}`;

  UI.updateNavigation?.(quizState.currentQuestionIndex, quizState.questions.length, quizState.isSubmitted);
  UI.hideStatus();
}

/**
 * Navigation between questions
 */
function handleNavigation(dir) {
  const newIndex = quizState.currentQuestionIndex + dir;
  if (newIndex >= 0 && newIndex < quizState.questions.length) {
    quizState.currentQuestionIndex = newIndex;
    renderQuestion();
  }
}

/**
 * Handle answer selection
 */
function handleAnswerSelection(questionId, selectedOption) {
  if (quizState.isSubmitted) return;
  quizState.userAnswers[questionId] = selectedOption;
  renderQuestion();
}

/**
 * Submit quiz
 */
async function handleSubmit() {
  if (quizState.isSubmitted) return;
  quizState.isSubmitted = true;
  quizState.score = 0;

  quizState.questions.forEach((q) => {
    const ans = quizState.userAnswers[q.id];
    if (ans && ans.toUpperCase() === (q.correct_answer || "").toUpperCase()) quizState.score++;
  });

  const user = getAuthUser();
  const result = {
    classId: quizState.classId,
    subject: quizState.subject,
    topic: quizState.topicSlug,
    difficulty: quizState.difficulty,
    score: quizState.score,
    total: quizState.questions.length,
    user_answers: quizState.userAnswers,
  };

  if (user) {
    try {
      await saveResult(result);
      console.log("[ENGINE] Quiz result saved.");
    } catch (e) {
      console.warn("[ENGINE] Save failed:", e);
    }
  }

  quizState.currentQuestionIndex = 0;
  renderQuestion();
  UI.showResults(quizState.score, quizState.questions.length);
  UI.renderAllQuestionsForReview?.(quizState.questions, quizState.userAnswers);
  UI.updateNavigation?.(quizState.currentQuestionIndex, quizState.questions.length, true);
}

/**
 * Load quiz questions from Supabase
 */
export async function loadQuiz() {
  try {
    UI.showStatus("Fetching questions...");
    const questions = await fetchQuestions(quizState.topicSlug, quizState.difficulty);
    if (!questions?.length) throw new Error("No questions found.");

    quizState.questions = questions;
    quizState.userAnswers = Object.fromEntries(questions.map((q) => [q.id, null]));
    quizState.currentQuestionIndex = 0;
    quizState.isSubmitted = false;

    renderQuestion();
    UI.attachAnswerListeners?.(handleAnswerSelection);
    UI.showView?.("quiz-content");
  } catch (err) {
    console.error("[ENGINE] loadQuiz failed:", err);
    UI.showStatus(`<span class="text-red-600">Error:</span> ${err.message}`);
  }
}

/**
 * Attach DOM event listeners
 */
function attachDomEventHandlers() {
  const els = UI.getElements?.() || {};
  els.prevButton?.addEventListener("click", () => handleNavigation(-1));
  els.nextButton?.addEventListener("click", () => handleNavigation(1));
  els.submitButton?.addEventListener("click", handleSubmit);
}

/**
 * Initialize quiz engine (after user login)
 */
async function initQuizEngine() {
  try {
    UI.initializeElements();
    parseUrlParameters();

    UI.showStatus("Initializing services...");
    await initializeServices();
    console.log("[ENGINE] Firebase & Supabase initialized.");

    attachDomEventHandlers();
    UI.hideStatus();

    // Load questions only after login (triggered externally)
    const user = getAuthUser();
    if (user) await loadQuiz();
    else UI.showStatus("Please sign in to continue.", "text-red-600");

    console.log("[ENGINE] Initialization complete.");
  } catch (err) {
    console.error("[ENGINE FATAL] Initialization failed:", err);
    UI.showStatus(`<span class="text-red-600">Critical error:</span> ${err.message}`);
  }
}

document.addEventListener("DOMContentLoaded", initQuizEngine);
