// js/ui-renderer.js
import { cleanKatexMarkers } from './utils.js';

let els = {};
let isInit = false;

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
  };

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
  if (els.title)
    els.title.textContent = `${topic.replace(/_/g, ' ').toUpperCase()} Quiz`;
  if (els.diffBadge)
    els.diffBadge.textContent = `Difficulty: ${diff}`;
}

/* -----------------------------------
   VIEW CONTROL
----------------------------------- */
export function showView(viewName) {
  initializeElements();
  const views = {
    'quiz-content': els.quizContent,
    'results-screen': els.reviewScreen,
    'paywall-screen': els.paywallScreen,
  };
  Object.values(views).forEach(v => v && v.classList.add('hidden'));
  if (views[viewName]) views[viewName].classList.remove('hidden');
}

/* -----------------------------------
   RENDER QUESTION
----------------------------------- */
export function renderQuestion(q, idx, selected, submitted) {
  initializeElements();
  if (!els.list) return;

  const type = (q.question_type || '').toLowerCase();
  const isARorCase = type === 'ar' || type === 'case';
  const reason = cleanKatexMarkers(q.scenario_reason || q.explanation || '');
  const qText = cleanKatexMarkers(q.text || '');

  const optionsHtml = ['A', 'B', 'C', 'D']
    .map(opt => {
      const txt = cleanKatexMarkers(q.options[opt] || '');
      const isSel = selected === opt;
      const isCorrect = submitted && q.correct_answer === opt;
      const isWrong = submitted && isSel && !isCorrect;

      let cls =
        'option-label flex items-start p-3 border-2 rounded-lg cursor-pointer transition';
      if (isCorrect) cls += ' border-green-600 bg-green-50';
      else if (isWrong) cls += ' border-red-600 bg-red-50';
      else if (isSel) cls += ' border-blue-500 bg-blue-50';

      return `
        <label class="block">
          <input type="radio" name="q-${q.id}" value="${opt}" class="hidden"
            ${isSel ? 'checked' : ''} ${submitted ? 'disabled' : ''}>
          <div class="${cls}">
            <span class="font-bold mr-2">${opt}.</span>
            <span>${txt}</span>
          </div>
        </label>`;
    })
    .join('');

  els.list.innerHTML = `
    <div class="space-y-6">
      <p class="text-lg font-bold text-gray-800">Q${idx}: ${qText}</p>
      ${isARorCase && reason
        ? `<p class="italic text-gray-700 border-l-4 border-blue-400 pl-4">Reason (R): ${reason}</p>`
        : ''}
      <div class="space-y-3">${optionsHtml}</div>
      ${
        submitted && isARorCase && reason
          ? `<div class="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-500"><b>Explanation:</b> ${reason}</div>`
          : ''
      }
    </div>`;

  if (els.counter)
    els.counter.textContent = `${idx} / ${els._total || '--'}`;
}

/* -----------------------------------
   ANSWER LISTENERS
----------------------------------- */
export function attachAnswerListeners(handler) {
  initializeElements();
  if (!els.list) return;

  if (els._listener) els.list.removeEventListener('change', els._listener);

  const listener = e => {
    if (e.target.type === 'radio' && e.target.name.startsWith('q-')) {
      co
