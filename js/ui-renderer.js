// js/ui-renderer.js
import { cleanKatexMarkers } from './utils.js';

let els = {};
let isInit = false;

/**
 * Cache DOM elements used by engine and UI module.
 * Exposes the elements map via getElements() so engine can attach listeners.
 */
export function initializeElements() {
  if (isInit) return;

  els = {
    // header / status
    title: document.getElementById('quiz-page-title'),
    diffBadge: document.getElementById('difficulty-display'),
    status: document.getElementById('status-message'),
    // quiz containers & controls
    quizContent: document.getElementById('quiz-content'),
    list: document.getElementById('question-list'),
    counter: document.getElementById('question-counter'),
    prevButton: document.getElementById('prev-btn'),
    nextButton: document.getElementById('next-btn'),
    submitButton: document.getElementById('submit-btn'),
    // paywall / auth
    paywallScreen: document.getElementById('paywall-screen'),
    paywallContent: document.getElementById('paywall-content'),
    authNav: document.getElementById('auth-nav-container'),
    // results / review
    reviewScreen: document.getElementById('results-screen'),
    score: document.getElementById('score-display'),
    reviewCompleteBtn: document.getElementById('review-complete-btn'),
  };

  // defensive: if some elements are missing, create noop placeholders
  Object.keys(els).forEach(k => {
    if (!els[k]) els[k] = null;
  });

  isInit = true;
  console.log('[UI RENDERER] Elements initialized.');
}

/**
 * Return cached elements (initializes if needed)
 */
export function getElements() {
  if (!isInit) initializeElements();
  return els;
}

/* ---------------------------
   Status & header helpers
   --------------------------- */
export function showStatus(msg, cls = 'text-gray-700') {
  initializeElements();
  if (!els.status) return;
  els.status.innerHTML = msg;
  els.status.className = `p-3 font-semibold text-center ${cls}`;
  els.status.classList.remove('hidden');
}

export function hideStatus() {
  initializeElements();
  if (!els.status) return;
  els.status.classList.add('hidden');
}

export function updateHeader(topic, diff) {
  initializeElements();
  if (els.title && topic) els.title.textContent = `${topic.replace(/_/g, ' ').toUpperCase()} Quiz`;
  if (els.diffBadge && diff) els.diffBadge.textContent = `Difficulty: ${diff}`;
}

/* ---------------------------
   View toggles
   --------------------------- */
export function showView(viewName) {
  initializeElements();
  // hide all
  const views = {
    'quiz-content': els.quizContent,
    'results-screen': els.reviewScreen,
    'paywall-screen': els.paywallScreen,
  };
  Object.values(views).forEach(v => { if (v) v.classList.add('hidden'); });

  if (viewName && views[viewName]) views[viewName].classList.remove('hidden');
}

/* ---------------------------
   Question rendering
   --------------------------- */

/**
 * Render a single question.
 * idx: 1-based question index (engine should pass 1..N)
 * selected: option letter or null
 * submitted: boolean
 */
export function renderQuestion(question, idx, selected, submitted) {
  initializeElements();
  if (!els.list) return;

  const q = question || {};
  const isARorCase = (q.question_type || '').toLowerCase() === 'ar' || (q.question_type || '').toLowerCase() === 'case';
  const qText = cleanKatexMarkers(q.text || '');
  const reasonText = cleanKatexMarkers(q.explanation || ''); // matches api.js
  const total = typeof els._totalQuestions !== 'undefined' ? els._totalQuestions : '--';

  // Build options HTML
  const optionsHtml = ['A','B','C','D'].map(opt => {
    const optText = cleanKatexMarkers((q.options && q.options[opt]) || '');
    const isSelected = selected === opt;
    const isCorrect = submitted && (q.correct_answer || '').toUpperCase() === opt;
    const isIncorrect = submitted && isSelected && !isCorrect;

    let wrapperCls = 'option-label flex items-start p-3 border-2 rounded-lg cursor-pointer transition';
    if (isCorrect) wrapperCls += ' border-green-600 bg-green-50';
    else if (isIncorrect) wrapperCls += ' border-red-600 bg-red-50';
    else if (isSelected) wrapperCls += ' border-blue-500 bg-blue-50';

    // Ensure input is inside label so clicks toggle the radio
    return `
      <label class="block">
        <input type="radio" name="q-${q.id}" value="${opt}" class="hidden" ${isSelected ? 'checked' : ''} ${submitted ? 'disabled' : ''}>
        <div class="${wrapperCls}">
          <span class="font-bold mr-3 w-6">${opt}.</span>
          <div class="flex-1">${optText}</div>
          ${submitted && isCorrect ? `<span class="ml-3 text-green-700 font-semibold">Correct</span>` : ''}
          ${submitted && isIncorrect ? `<span class="ml-3 text-red-700 font-semibold">Your Answer</span>` : ''}
        </div>
      </label>
    `;
  }).join('');

  // Insert HTML
  els.list.innerHTML = `
    <div class="space-y-6">
      <p class="text-xl font-bold text-gray-800">Q${idx}: ${qText}</p>
      ${isARorCase && reasonText && !submitted ? `<p class="italic text-gray-700 border-l-4 border-blue-400 pl-4">Reason (R): ${reasonText}</p>` : ''}
      <div id="options-container" class="space-y-3 mt-2">
        ${optionsHtml}
      </div>
      ${submitted && isARorCase && reasonText ? `<div class="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-500"><strong>Explanation:</strong> ${reasonText}</div>` : ''}
    </div>
  `;

  // Update question counter (if present)
  if (els.counter) {
    els.counter.textContent = `${idx} / ${total}`;
  }
}

/* ---------------------------
   Attach answer listeners (delegated)
   --------------------------- */
export function attachAnswerListeners(handler) {
  initializeElements();
  if (!els.list) return;

  // remove previous listener if any
  if (els._answerListener) {
    try { els.list.removeEventListener('change', els._answerListener); } catch(e){}
  }

  const listener = (e) => {
    const target = e.target;
    if (target && target.type === 'radio' && target.name && target.name.startsWith('q-')) {
      const qid = target.name.slice(2);
      const val = target.value;
      if (typeof handler === 'function') handler(qid, val);
    }
  };

  els.list.addEventListener('change', listener);
  els._answerListener = listener;
}

/* ---------------------------
   Navigation / Results / Review
   --------------------------- */
export function updateNavigation(currentIndex, totalQuestions, isSubmitted) {
  initializeElements();
  // store total for counter updates
  els._totalQuestions = totalQuestions;

  if (els.prevButton) {
    if (currentIndex > 0) els.prevButton.classList.remove('hidden'); else els.prevButton.classList.add('hidden');
  }
  if (els.nextButton) {
    if (currentIndex < totalQuestions - 1) els.nextButton.classList.remove('hidden'); else els.nextButton.classList.add('hidden');
  }
  if (els.submitButton) {
    if (!isSubmitted && (currentIndex === totalQuestions - 1)) els.submitButton.classList.remove('hidden'); else els.submitButton.classList.add('hidden');
  }
  if (els.reviewCompleteBtn) {
    if (isSubmitted) els.reviewCompleteBtn.classList.remove('hidden'); else els.reviewCompleteBtn.classList.add('hidden');
  }

  // update counter immediately when navigation changes
  if (els.counter) {
    els.counter.textContent = `${currentIndex + 1} / ${totalQuestions}`; // engine uses 0-based here
  }
}

/**
 * Render a full review page (shows all questions, user answers & correct answers)
 * questions: array of question objects
 * userAnswers: object map qid -> selected option
 */
export function renderAllQuestionsForReview(questions, userAnswers = {}) {
  initializeElements();
  if (!els.list) return;

  const html = questions.map((q, i) => {
    const qText = cleanKatexMarkers(q.text || '');
    const reason = cleanKatexMarkers(q.explanation || '');
    const userAns = (userAnswers && userAnswers[q.id]) ? userAnswers[q.id] : '-';
    const correct = q.correct_answer || '-';
    const isCorrect = userAns === correct;

    return `
      <div class="mb-6 p-4 bg-gray-50 rounded-lg border">
        <p class="font-bold text-lg mb-1">Q${i + 1}: ${qText}</p>
        ${reason ? `<p class="italic text-gray-600 mb-2">Reason (R): ${reason}</p>` : ''}
        <p class="text-sm">Your Answer: <span class="${isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}">${userAns}</span></p>
        <p class="text-green-700 font-semibold">Correct Answer: ${correct}</p>
      </div>
    `;
  }).join('');

  els.list.innerHTML = html;
  showView('results-screen');
}

/* ---------------------------
   Score display
   --------------------------- */
export function showResults(score, total) {
  initializeElements();
  if (els.score) els.score.textContent = `${score} / ${total}`;
  showView('results-screen');
}

/* ---------------------------
   Difficulty retry options + back to chapters
   --------------------------- */
export function renderDifficultyOptions(currentTopic, currentDifficulty) {
  initializeElements();
  if (!els.reviewScreen) return;

  // remove previous options block if present
  const existing = els.reviewScreen.querySelector('.difficulty-options-block');
  if (existing) existing.remove();

  const difficulties = ['simple','medium','advanced'];
  const labels = { simple:'Simple (Easy)', medium:'Medium', advanced:'Advanced (Hard)' };

  const buttonsHtml = difficulties.map(d => {
    const isCurrent = d === currentDifficulty;
    const classBase = isCurrent ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
      d === 'simple' ? 'bg-green-500 hover:bg-green-600 text-white' :
      d === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
      'bg-red-500 hover:bg-red-600 text-white';
    return `<button data-diff="${d}" ${isCurrent ? 'disabled' : ''} class="px-5 py-2 rounded ${classBase}">${labels[d]}</button>`;
  }).join(' ');

  const container = document.createElement('div');
  container.className = 'difficulty-options-block mt-6 text-center';
  container.innerHTML = `
    <h3 class="text-lg font-semibold mb-3">Try another difficulty</h3>
    <div class="flex justify-center gap-3 flex-wrap">${buttonsHtml}</div>
    <div class="mt-4">
      <button id="back-to-chapters-btn" class="px-5 py-2 bg-blue-600 text-white rounded">Choose Another Topic</button>
    </div>
  `;

  els.reviewScreen.appendChild(container);

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-diff]');
    if (btn) {
      const diff = btn.dataset.diff;
      if (!diff) return;
      const params = new URLSearchParams(window.location.search);
      params.set('difficulty', diff);
      window.location.href = `quiz-engine.html?${params.toString()}`;
      return;
    }
    if (e.target && e.target.id === 'back-to-chapters-btn') {
      window.location.href = 'chapter-selection.html';
    }
  });
}

/* ---------------------------
   Utility helpers
   --------------------------- */

/**
 * Hide everything and show paywall / quiz / results via showView()
 * (already implemented above)
 */

/* ---------------------------
   Export complete
   --------------------------- */
