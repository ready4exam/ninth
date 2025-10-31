// js/quiz-engine.js
// -------------------------------------------------------------
// Handles quiz lifecycle and authentication flow
// -------------------------------------------------------------
import { initializeServices, getAuthUser } from "./config.js";
import { fetchQuestions, saveResult } from "./api.js";
import * as UI from "./ui-renderer.js";
import {
  initializeAuthListener,
  signInWithGoogle,
  signOut,
  checkAccess,
} from "./auth-paywall.js";

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

function parseUrlParameters() {
  const params = new URLSearchParams(window.location.search);
  quizState.classId = params.get("class");
  quizState.subject = params.get("subject");
  quizState.topicSlug = params.get("topic");
  quizState.difficulty = params.get("difficulty") || "Simple";
  if (!quizState.topicSlug) throw new Error("Missing topic parameter.");
  UI.updateHeader(quizState.topicSlug, quizState.difficulty);
}

function renderQuestion() {
  const q = quizState.questions[quizState.currentQuestionIndex];
  if (!q) return UI.showStatus("No question to display.");
  UI.renderQuestion(q, quizState.currentQuestionIndex + 1, quizState.userAnswers[q.id], quizState.isSubmitted);
  UI.updateNavigation(quizState.currentQuestionIndex, quizState.questions.length, quizState.isSubmitted);
}

function handleAnswerSelection(qid, opt) {
  if (quizState.isSubmitted) return;
  quizState.userAnswers[qid] = opt;
}

function handleNavigation(dir) {
  const next = quizState.currentQuestionIndex + dir;
  if (next >= 0 && next < quizState.questions.length) {
    quizState.currentQuestionIndex = next;
    renderQuestion();
  }
}

async function handleSubmit() {
  quizState.isSubmitted = true;
  quizState.score = quizState.questions.filter(
    (q) => quizState.userAnswers[q.id]?.toUpperCase() === q.correct_answer
  ).length;

  const user = getAuthUser();
  if (user) {
    await saveResult({
      classId: quizState.classId,
      subject: quizState.subject,
      topic: quizState.topicSlug,
      difficulty: quizState.difficulty,
      score: quizState.score,
      total: quizState.questions.length,
      user_answers: quizState.userAnswers,
    });
  }

  UI.showResults(quizState.score, quizState.questions.length);
  UI.renderAllQuestionsForReview(quizState.questions, quizState.userAnswers);
}

async function loadQuiz() {
  UI.showStatus("Loading quiz questions...");
  const questions = await fetchQuestions(quizState.topicSlug, quizState.difficulty);
  quizState.questions = questions;
  quizState.userAnswers = Object.fromEntries(questions.map((q) => [q.id, null]));
  quizState.currentQuestionIndex = 0;
  quizState.isSubmitted = false;

  UI.attachAnswerListeners(handleAnswerSelection);
  renderQuestion();
  UI.showView("quiz-content");
}

async function onAuthChange(user) {
  const paywall = document.getElementById("paywall-screen");
  const welcome = document.getElementById("welcome-user");
  const logoutBtn = document.getElementById("logout-nav-btn");
  const signInBtn = document.getElementById("google-signin-btn");

  if (user) {
    welcome.textContent = `Welcome, ${user.displayName?.split(" ")[0] || "Student"}!`;
    welcome.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    logoutBtn.onclick = () => signOut();
    paywall.classList.add("hidden");
    await loadQuiz();
  } else {
    welcome.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    UI.showView("paywall-screen");
    if (signInBtn) signInBtn.onclick = () => signInWithGoogle();
  }
}

function attachEvents() {
  const els = UI.getElements();
  els.prevButton?.addEventListener("click", () => handleNavigation(-1));
  els.nextButton?.addEventListener("click", () => handleNavigation(1));
  els.submitButton?.addEventListener("click", handleSubmit);
}

async function init() {
  try {
    UI.initializeElements();
    parseUrlParameters();
    await initializeServices();
    await initializeAuthListener(onAuthChange);
    attachEvents();
  } catch (e) {
    console.error("[ENGINE INIT ERROR]", e);
    UI.showStatus(`<span class='text-red-600'>${e.message}</span>`);
  }
}

document.addEventListener("DOMContentLoaded", init);
