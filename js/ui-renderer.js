// js/ui-renderer.js
import { cleanKatexMarkers } from './utils.js';

let els = {};
let isInit = false;

function normalizeReasonText(txt) {
  if (!txt) return '';
  return txt
    .replace(/^\s*Reasoning\s*:\s*/i, '')
    .replace(/^\s*Reason\s*\(R\)\s*:\s*/i, '')
    .replace(/^\s*Reason\s*:\s*/i, '')
    .trim();
}

/* -----------------------------------
   ELEMENT INITIALIZATION
----------------------------------- */
export function initializeElements() {
  if (isInit) return;

  els = {
    title: document.getElementById('quiz-page-title'),
    diffBadge: document.getElementById('difficulty-display'),
    status: document.getElementById('status-message'),
    list: document.getElementById('question-list'),
    counter: document.getElementById('question-counter'),
    prevButton: document.getElementById('prev-btn'),
    nextButton: document.getElementById('next-btn'),
    submitButton: document.getElementById('submit-btn'),
    reviewScreen: document.getElementById('results-screen'),
    score: document.getElementById('score-display'),
    reviewCompleteBtn: document.getElementById('review-complete-btn'),
    authNav: document.getElementById('auth-nav-container'),
    paywallScreen: document.getElementById('paywall-screen'),
    paywallContent: document.getElementById('paywall-content'),
    quizContent: document.getElementById('quiz-content'),
    reviewContainer: document.getElementById('review-container'),
    statusOverlayId: 'auth-loading-overlay'
  };

  if (!els.reviewContainer) {
    const rc = document.createElement('div');
    rc.id = 'review-container';
    rc.className = 'w-full max-w-3xl text-left mb-8';
    const resultsSection = document.getElementById('results-screen');
    if (resultsSection) resultsSection.insertBefore(rc, resultsSection.querySelector('.flex') || null);
    els.reviewContainer = document.getElementById('review-container');
  }

  isInit = true;
  console.log('[UI] Elements initialized.');
}

export function getElements() {
  if (!isInit) initializeElements();
  return els;
}

/* -----------------------------------
   STATUS + HEADER
----------------------------------- */
export function showStatus(msg, cls = 'text-gray-700') {
  initializeElements();
  if (!els.status) return;
  els.status.innerHTML = msg;
  els.status.className = `p-3 text-center font-semibold ${cls}`;
  els.status.classList.remove('hidden');
}
export function hideStatus() {
  initializeElements();
  if (els.status) els.status.classList.add('hidden');
}
export function updateHeader(topic, diff) {
  initializeElements();
  if (els.title) {
    const text = (typeof topic === 'string' && topic.length)
      ? `${topic.replace(/_/g, ' ').toUpperCase()} Quiz`
      : 'Ready4Exam Quiz';
    els.title.textContent = text;
  }
  if (els.diffBadge) els.diffBadge.textContent = `Difficulty: ${diff || '--'}`;
}

/* -----------*
