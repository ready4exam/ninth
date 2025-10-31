// js/quiz-engine.js
import { initializeServices, getAuthUser, logAnalyticsEvent } from "./config.js";
import { fetchQuestions, saveResult } from "./api.js";
import * as UI from "./ui-renderer.js";
import {
  checkAccess,
  initializeAuthListener,
  signInWithGoogle,
  signOut,
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
  const urlParams = new URLSearchParams(window.location.search);
  quizState.topicSlug = urlParams.get("topic");
  quizState.difficulty = urlParams.get("difficulty");
  if (!quizState.topicSlug) throw new Error("Missing topic parameter.");
  UI.updateHeader(quizState.topicSlug, quizState.difficulty);
}

function renderQuestion() {
  const q = quizState.questions[quizState.currentQuestionIndex];
  if (!q) return UI.showStatus("No question to display.");
  UI.renderQuestion(q, quizState.currentQuestionIndex, quizState.userAnswers[q.id], quizState.isSubmitted);
  UI.updateNavigation(quizState.currentQuestionIndex, quizState.questions.length, quizState.isSubmitted);
  UI.hideStatus();
}

function handleAnswerSelection(id, opt) {
  if (quizState.isSubmitted) return;
  quizState.userAnswers[id] = opt;
  renderQuestion();
}

async function handleSubmit() {
  if (quizState.isSubmitted) return;
  quizState.isSubmitted = true;
  quizState.score = quizState.questions.reduce((acc, q) => {
    const ans = quizState.userAnswers[q.id];
    return acc + (ans && ans.toUpperCase() === q.correct_answer ? 1 : 0);
  }, 0);

  const user = getAuthUser();
  const result = {
    topic: quizState.topicSlug,
    difficulty: quizState.difficulty,
    score: quizState.score,
    total: quizState.questions.length,
  };

  await saveResult(result);

  // Track completion in GA4
  logAnalyticsEvent("quiz_completed", {
    user_id: user?.uid || "guest",
    topic: result.topic,
    difficulty: result.difficulty,
    score: result.score,
    total: result.total,
  });

  UI.showResults(result.score, result.total);
  UI.renderAllQuestionsForReview(quizState.questions, quizState.userAnswers);
}

async function loadQuiz() {
  UI.showStatus("Fetching questions...");
  const data = await fetchQuestions(quizState.topicSlug, quizState.difficulty);
  quizState.questions = data;
  quizState.userAnswers = Object.fromEntries(data.map((q) => [q.id, null]));
  UI.attachAnswerListeners(handleAnswerSelection);
  renderQuestion();
  UI.showView("quiz-content");
}

async function onAuthChange(user) {
  if (user) await loadQuiz();
  else UI.showView("paywall-screen");
}

document.addEventListener("DOMContentLoaded", async () => {
  UI.initializeElements();
  parseUrlParameters();
  await initializeServices();
  await initializeAuthListener(onAuthChange);

  const els = UI.getElements();
  els.prevButton?.addEventListener("click", () => (quizState.currentQuestionIndex--, renderQuestion()));
  els.nextButton?.addEventListener("click", () => (quizState.currentQuestionIndex++, renderQuestion()));
  els.submitButton?.addEventListener("click", handleSubmit);
});
