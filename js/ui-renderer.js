// js/ui-renderer.js
import { cleanKatexMarkers } from './utils.js';

let els = {};
let isInit = false;

function normalizeReasonText(txt) {
  if (!txt) return "";
  return txt
    .replace(/^\s*(Reasoning|Reason|Context)\s*(\(R\))?\s*:\s*/i, "")
    .trim();
}

/* -----------------------------------
   ELEMENT INITIALIZATION
----------------------------------- */
export function initializeElements() {
  if (isInit) return;

  els = {
    title: document.getElementById("quiz-page-title"),
    diffBadge: document.getElementById("difficulty-display"),
    status: document.getElementById("status-message"),
    list: document.getElementById("question-list"),
    counter: document.getElementById("question-counter"),
    prevButton: document.getElementById("prev-btn"),
    nextButton: document.getElementById("next-btn"),
    submitButton: document.getElementById("submit-btn"),
    reviewScreen: document.getElementById("results-screen"),
    score: document.getElementById("score-display"),
    authNav: document.getElementById("auth-nav-container"),
    paywallScreen: document.getElementById("paywall-screen"),
    paywallContent: document.getElementById("paywall-content"),
    quizContent: document.getElementById("quiz-content"),
    reviewContainer: document.getElementById("review-container"),
    welcomeUser: document.getElementById("welcome-user"),
  };

  if (!els.reviewContainer) {
    const rc = document.createElement("div");
    rc.id = "review-container";
    rc.className = "w-full max-w-3xl text-left mb-8";
    const resultsSection = document.getElementById("results-screen");
    if (resultsSection) {
      resultsSection.insertBefore(rc, resultsSection.querySelector(".flex") || null);
    }
    els.reviewContainer = document.getElementById("review-container");
  }

  isInit = true;
  console.log("[UI] Elements initialized.");
}

export function getElements() {
  if (!isInit) initializeElements();
  return els;
}

/* -----------------------------------
   STATUS + HEADER
----------------------------------- */
export function showStatus(msg, cls = "text-gray-700") {
  initializeElements();
  if (!els.status) return;
  els.status.innerHTML = msg;
  els.status.className = `p-3 text-center font-semibold ${cls}`;
  els.status.classList.remove("hidden");
}

export function hideStatus() {
  initializeElements();
  if (els.status) els.status.classList.add("hidden");
}

export function updateHeader(topic, diff) {
  initializeElements();
  if (els.title) {
    const text =
      typeof topic === "string" && topic.length
        ? `${topic.replace(/_/g, " ").toUpperCase()} Quiz`
        : "Ready4Exam Quiz";
    els.title.textContent = text;
  }
  if (els.diffBadge) {
    els.diffBadge.textContent = `Difficulty: ${diff || "--"}`;
    els.diffBadge.classList.remove("hidden");
  }
}

/* -----------------------------------
   AUTH UI
----------------------------------- */
export function updateAuthUI(user) {
  initializeElements();
  if (!els.authNav) return;

  const welcomeEl = els.welcomeUser;

  if (user) {
    const name =
      user.displayName?.split(" ")[0] ||
      user.email?.split("@")[0] ||
      "Student";
    if (welcomeEl) {
      welcomeEl.textContent = `Welcome, ${name}!`;
      welcomeEl.classList.remove("hidden");
    }
    els.authNav.querySelector("#logout-nav-btn")?.classList.remove("hidden");
  } else {
    if (welcomeEl) welcomeEl.classList.add("hidden");
    els.authNav.querySelector("#logout-nav-btn")?.classList.add("hidden");
  }
}

/* -----------------------------------
   AUTH LOADING OVERLAY
----------------------------------- */
export function showAuthLoading(message = "Signing you in — please wait...") {
  initializeElements();
  let overlay = document.getElementById("auth-loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "auth-loading-overlay";
    overlay.className =
      "fixed inset-0 bg-white/80 flex items-center justify-center z-50";
    overlay.innerHTML = `
      <div class="p-6 rounded-lg shadow-lg text-center max-w-lg bg-white">
        <div class="text-2xl font-bold mb-2">Signing in</div>
        <div class="text-sm text-gray-700 mb-4">${message}</div>
        <div class="w-12 h-12 mx-auto mb-1">
          <svg class="animate-spin w-12 h-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  } else {
    const msgEl = overlay.querySelector(".text-sm.text-gray-700");
    if (msgEl) msgEl.textContent = message;
    overlay.classList.remove("hidden");
  }
}

export function hideAuthLoading() {
  const overlay = document.getElementById("auth-loading-overlay");
  if (overlay) overlay.remove();
}

/* -----------------------------------
   VIEW CONTROL
----------------------------------- */
export function showView(viewName) {
  initializeElements();
  const views = {
    "quiz-content": els.quizContent,
    "results-screen": els.reviewScreen,
    "paywall-screen": els.paywallScreen,
  };
  Object.values(views).forEach((v) => v && v.classList.add("hidden"));
  if (views[viewName]) views[viewName].classList.remove("hidden");
}

/* -----------------------------------
   QUESTION RENDERING
----------------------------------- */
export function renderQuestion(q, idxZeroBased, selected, submitted) {
  initializeElements();
  if (!els.list) return;

  const type = (q.question_type || "").toLowerCase();
  const qText = cleanKatexMarkers(q.text || "");
  let reasonRaw = q.explanation || q.scenario_reason || "";
  const reason = normalizeReasonText(cleanKatexMarkers(reasonRaw));

  let label = "";
  if (type === "ar") label = "Reasoning (R)";
  else if (type === "case") label = "Context";

  const reasonHtml =
    (type === "ar" || type === "case") && reason && !submitted
      ? `<p class="text-gray-700 mt-2 mb-3">${label}: ${reason}</p>`
      : "";

  const submittedExplanationHtml =
    submitted && (type === "ar" || type === "case") && reason
      ? `<div class="mt-3 p-3 bg-gray-50 rounded text-gray-700 border border-gray-100"><b>${label}:</b> ${reason}</div>`
      : "";

  const optionsHtml = ["A", "B", "C", "D"]
    .map((opt) => {
      const txt = cleanKatexMarkers(q.options?.[opt] || "");
      const isSel = selected === opt;
      const isCorrect = submitted && (q.correct_answer || "").toUpperCase() === opt;
      const isWrong = submitted && isSel && !isCorrect;

      let cls =
        "option-label flex items-start p-3 border-2 rounded-lg cursor-pointer transition";
      if (isCorrect) cls += " border-green-600 bg-green-50";
      else if (isWrong) cls += " border-red-600 bg-red-50";
      else if (isSel) cls += " border-blue-500 bg-blue-50";

      return `
        <label class="block">
          <input type="radio" name="q-${q.id}" value="${opt}" class="hidden" ${isSel ? "checked" : ""} ${submitted ? "disabled" : ""}>
          <div class="${cls}">
            <span class="font-bold mr-3">${opt}.</span>
            <span class="text-gray-800">${txt}</span>
          </div>
        </label>`;
    })
    .join("");

  els.list.innerHTML = `
    <div class="space-y-6">
      <p class="text-lg font-bold text-gray-800">Q${idxZeroBased + 1}: ${qText}</p>
      ${reasonHtml}
      <div class="space-y-3">${optionsHtml}</div>
      ${submittedExplanationHtml}
    </div>`;

  if (els.counter) {
    const total = els._total || "--";
    els.counter.textContent = `${idxZeroBased + 1} / ${total}`;
  }
}

/* -----------------------------------
   NAVIGATION
----------------------------------- */
export function updateNavigation(currentIndexZeroBased, totalQuestions, submitted) {
  initializeElements();
  els._total = totalQuestions;
  const show = (btn, cond) => btn && btn.classList.toggle("hidden", !cond);
  show(els.prevButton, currentIndexZeroBased > 0);
  show(els.nextButton, currentIndexZeroBased < totalQuestions - 1);
  show(els.submitButton, !submitted && currentIndexZeroBased === totalQuestions - 1);
  if (els.counter)
    els.counter.textContent = `${currentIndexZeroBased + 1} / ${totalQuestions}`;
}

/* -----------------------------------
   RESULTS + REVIEW
----------------------------------- */
export function showResults(score, total) {
  initializeElements();
  if (els.score) els.score.textContent = `${score} / ${total}`;
  showView("results-screen");
}
