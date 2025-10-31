// js/ui-renderer.js
import { cleanKatexMarkers } from './utils.js';

let els = {};
let isInit = false;

/**
 * Cache DOM elements for quick access.
 */
export function initializeElements() {
  if (isInit) return;

  els = {
    // Header / Status
    title: document.getElementById('quiz-page-title'),
    diffBadge: document.getElementById('difficulty-display'),
    status: document.getElementById('status-message'),

    // Quiz elements
    list: document.getElementById('question-list'),
    counter: document.getElementById('question-counter'),
    prevButton: document.getElementById('prev-btn'),
    nextButton: document.getElementById('next-btn'),
    submitButton: document.getElementById('submit-btn'),
    reviewCompleteBtn: document.getElementById('review-complete-btn'),

    // Results / Review
    reviewScreen: document.getElementById('results-screen'),
    score: document.getElementById('score-display'),

    // Auth / paywall
    authNav: document.getElementById('auth-nav-container'),
    paywall: document.getElementById('paywall-screen'),
    paywallContent: document.getElementById('paywall-content'),
  };

  isInit = true;
  console.log('[UI RENDERER] Elements initialized.');
}

export function getElements() {
  if (!isInit) initializeElements();
  return els;
}

/**
 * Show a status message at the top.
 */
export function showStatus(msg, cls = 'text-gray-700') {
  initializeElements();
  els.status.innerHTML = msg;
  els.status.className = `p-3 font-semibold text-center ${cls}`;
  els.status.classList.remove('hidden');
}

export function hideStatus() {
  initializeElements();
  els.status.classList.add('hidden');
}

/**
 * Update header with topic name & difficulty.
 */
export function updateHeader(topic, diff) {
  initializeElements();
  if (els.title) els.title.textContent = `${topic.toUpperCase()} Quiz`;
  if (els.diffBadge) els.diffBadge.textContent = `Difficulty: ${diff}`;
}

/**
 * Renders a single question.
 * Displays scenario/explanation ONLY for AR or Case-type questions and only after submission.
 */
export function renderQuestion(q, index, selectedAnswer, isSubmitted) {
  initializeElements();
  if (!els.list) return;

  const isAR = q.question_type === 'ar' || q.question_type === 'case';
  const questionText = cleanKatexMarkers(q.text || '');
  const reasonText = cleanKatexMarkers(q.explanation || '');

  els.list.innerHTML = `
    <div class="space-y-4">
      <p class="text-lg font-bold text-gray-800">Q${index}: ${questionText}</p>

      ${isSubmitted && isAR && reasonText
        ? `<p class="italic text-gray-700 border-l-4 border-blue-400 pl-4">${reasonText}</p>`
        : ''}

      <div class="space-y-3">
        ${['A', 'B', 'C', 'D']
          .map((opt) => {
            const optText = cleanKatexMarkers(q.options?.[opt] || '');
            const isSel = selectedAnswer === opt;
            const isCorrect = isSubmitted && q.correct_answer === opt;
            const isWrong = isSubmitted && isSel && !isCorrect;

            let cls = 'option-label flex items-center p-3 border-2 rounded-lg transition';
            if (isCorrect) cls += ' border-green-600 bg-green-50';
            else if (isWrong) cls += ' border-red-600 bg-red-50';
            else if (isSel) cls += ' border-blue-500 bg-blue-50';

            return `
              <label class="block">
                <input type="radio" name="q-${q.id}" value="${opt}" class="hidden" ${isSel ? 'checked' : ''} ${isSubmitted ? 'disabled' : ''}>
                <div class="${cls}">
                  <span class="font-bold mr-2">${opt}.</span>
                  <p class="flex-grow">${optText}</p>
                </div>
              </label>`;
          })
          .join('')}
      </div>
    </div>
  `;

  if (els.counter) {
    els.counter.textContent = `${index} / ${quizLengthSafe()}`;
  }
}

/**
 * Show all correct answers in a summary view (after submit).
 */
export function renderAllQuestionsForReview(questions, userAnswers = {}) {
  initializeElements();
  if (!els.list) return;

  els.list.innerHTML = questions
    .map((q, i) => {
      const isAR = q.question_type === 'ar' || q.question_type === 'case';
      const reasonText = cleanKatexMarkers(q.explanation || '');
      const qText = cleanKatexMarkers(q.text || '');
      const userAns = userAnswers[q.id] || '-';
      const correct = q.correct_answer || '-';
      const isCorrect = userAns === correct;

      return `
        <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
          <p class="font-bold text-lg mb-1">Q${i + 1}: ${qText}</p>
          ${isAR && reasonText ? `<p class="italic text-gray-600 mb-2">${reasonText}</p>` : ''}
          <p class="text-sm">Your Answer: <span class="${isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}">${userAns}</span></p>
          <p class="text-green-700 font-semibold">Correct Answer: ${correct}</p>
        </div>
      `;
    })
    .join('');

  showView('results-screen');
}

/**
 * Update navigation button visibility depending on quiz state.
 */
export function updateNavigation(currentIndex, total, isSubmitted) {
  initializeElements();
  const { prevButton, nextButton, submitButton, reviewCompleteBtn } = els;
  if (!prevButton || !nextButton) return;

  prevButton.classList.add('hidden');
  nextButton.classList.add('hidden');
  submitButton?.classList.add('hidden');
  reviewCompleteBtn?.classList.add('hidden');

  if (!isSubmitted) {
    if (currentIndex > 0) prevButton.classList.remove('hidden');
    if (currentIndex < total - 1) nextButton.classList.remove('hidden');
    if (currentIndex === total - 1) submitButton?.classList.remove('hidden');
  } else {
    if (currentIndex > 0) prevButton.classList.remove('hidden');
    if (currentIndex < total - 1) nextButton.classList.remove('hidden');
    reviewCompleteBtn?.classList.remove('hidden');
  }
}

/**
 * Attach delegated answer listener for radio buttons.
 */
export function attachAnswerListeners(handler) {
  initializeElements();
  if (!els.list) return;
  els.list.addEventListener('change', (e) => {
    const r = e.target;
    if (r.type === 'radio' && r.name.startsWith('q-')) {
      handler(r.name.slice(2), r.value);
    }
  });
}

/**
 * Manage which section of the quiz UI is visible.
 */
export function showView(view) {
  initializeElements();
  const quizContent = document.getElementById('quiz-content');
  const paywall = els.paywall;
  const review = els.reviewScreen;
  [quizContent, paywall, review].forEach((v) => v && v.classList.add('hidden'));

  if (view === 'quiz-content' && quizContent) quizContent.classList.remove('hidden');
  if (view === 'results-screen' && review) review.classList.remove('hidden');
  if (view === 'paywall-screen' && paywall) paywall.classList.remove('hidden');
}

/**
 * Update score display on results screen.
 */
export function showResults(score, total) {
  initializeElements();
  if (els.score) els.score.textContent = `${score} / ${total}`;
  showView('results-screen');
}

/**
 * Utility to avoid undefined total
 */
function quizLengthSafe() {
  const list = document.getElementById('question-list');
  return list ? list.children.length || '--' : '--';
}
