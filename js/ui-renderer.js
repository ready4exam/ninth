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
  if (els.title) els.title.textContent = `${topic.replace(/_/g, ' ').toUpperCase()} Quiz`;
  if (els.diffBadge) els.diffBadge.textContent = `Difficulty: ${diff}`;
}

/* -----------------------------------
   RENDER QUESTION
----------------------------------- */
export function renderQuestion(q, idx, selected, submitted) {
  initializeElements();
  if (!els.list) return;

  const qType = (q.question_type || '').toLowerCase();
  const isAR = qType === 'ar';
  const isCase = qType === 'case';
  const qText = cleanKatexMarkers(q.text || '');
  const reasonText = cleanKatexMarkers(q.scenario_reason || q.explanation || '');

  // Avoid duplicate reasoning if already in table
  const showReason =
    (isAR || isCase) && reasonText && !q.text.toLowerCase().includes(reasonText.toLowerCase());

  const reasonLabel = isCase ? 'Context' : 'Reasoning';

  const optionsHtml = ['A', 'B', 'C', 'D']
    .map(opt => {
      const txt = cleanKatexMarkers(q.options[opt] || '');
      const isSel = selected === opt;
      const isCorrect = submitted && q.correct_answer === opt;
      const isWrong = submitted && isSel && !isCorrect;

      let cls = 'option-label flex items-start p-3 border-2 rounded-lg cursor-pointer transition';
      if (isCorrect) cls += ' border-green-600 bg-green-50';
      else if (isWrong) cls += ' border-red-600 bg-red-50';
      else if (isSel) cls += ' border-blue-500 bg-blue-50';

      return `
        <label class="block">
          <input type="radio" name="q-${q.id}" value="${opt}" class="hidden" ${isSel ? 'checked' : ''} ${submitted ? 'disabled' : ''}>
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
      ${
        showReason && !submitted
          ? `<p class="italic text-gray-700 pl-2">${reasonLabel}: ${reasonText}</p>`
          : ''
      }
      <div class="space-y-3">${optionsHtml}</div>
      ${
        submitted && showReason
          ? `<div class="mt-3 p-3 bg-gray-50 rounded"><b>${reasonLabel}:</b> ${reasonText}</div>`
          : ''
      }
    </div>`;

  if (els.counter) els.counter.textContent = `${idx} / ${els._total || '--'}`;
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
      const qid = e.target.name.substring(2);
      handler(qid, e.target.value);
    }
  };
  els.list.addEventListener('change', listener);
  els._listener = listener;
}

/* -----------------------------------
   NAVIGATION + COUNTER
----------------------------------- */
export function updateNavigation(currentIndex, totalQuestions, submitted) {
  initializeElements();
  els._total = totalQuestions;

  const show = (btn, cond) => btn && btn.classList.toggle('hidden', !cond);

  show(els.prevButton, currentIndex > 0);
  show(els.nextButton, currentIndex < totalQuestions - 1);
  show(els.submitButton, !submitted && currentIndex === totalQuestions - 1);
  show(els.reviewCompleteBtn, submitted);

  if (els.counter) els.counter.textContent = `${currentIndex + 1} / ${totalQuestions}`;
}

/* -----------------------------------
   RESULTS + REVIEW
----------------------------------- */
export function showResults(score, total) {
  initializeElements();
  if (els.score) els.score.textContent = `${score} / ${total}`;
  showView('results-screen');
  renderDifficultyOptions();
}

export function renderAllQuestionsForReview(questions, userAnswers = {}) {
  initializeElements();
  if (!els.list) return;

  const html = questions
    .map((q, i) => {
      const txt = cleanKatexMarkers(q.text || '');
      const reason = cleanKatexMarkers(q.scenario_reason || q.explanation || '');
      const ua = userAnswers[q.id] || '-';
      const ca = q.correct_answer || '-';
      const correct = ua === ca;
      const reasonLabel =
        (q.question_type || '').toLowerCase() === 'case' ? 'Context' : 'Reasoning';

      return `
      <div class="mb-6 p-4 bg-gray-50 rounded-lg border">
        <p class="font-bold text-lg mb-1">Q${i + 1}: ${txt}</p>
        ${reason ? `<p class="italic text-gray-600 mb-2">${reasonLabel}: ${reason}</p>` : ''}
        <p>Your Answer: <span class="${
          correct ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'
        }">${ua}</span></p>
        <p>Correct Answer: <b class="text-green-700">${ca}</b></p>
      </div>`;
    })
    .join('');
  els.list.innerHTML = html;
}

/* -----------------------------------
   AUTH UI
----------------------------------- */
export function updateAuthUI(user) {
  initializeElements();
  if (!els.authNav) return;
  if (user) {
    const name = user.displayName
      ? user.displayName.split(' ')[0]
      : user.email
      ? user.email.split('@')[0]
      : 'User';
    els.authNav.innerHTML = `
      <span class="text-white text-sm mr-2">Hi, ${name}</span>
      <button id="logout-nav-btn" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Sign Out</button>`;
  } else {
    els.authNav.innerHTML = `
      <button id="login-btn" class="px-4 py-2 bg-white text-cbse-blue rounded hover:bg-gray-100">Sign In (Google)</button>`;
  }
}

/* -----------------------------------
   RESTART / DIFFICULTY OPTIONS
----------------------------------- */
export function renderDifficultyOptions() {
  initializeElements();
  const diffs = ['simple', 'medium', 'advanced'];
  const labels = {
    simple: 'Simple (Easy)',
    medium: 'Medium',
    advanced: 'Advanced (Hard)',
  };

  const wrapper = document.createElement('div');
  wrapper.className = 'mt-6 text-center';
  wrapper.innerHTML = `
    <h3 class="text-lg font-semibold mb-3">Take Another Quiz</h3>
    <div class="flex justify-center gap-3 flex-wrap">
      ${diffs
        .map(
          d => `<button data-diff="${d}" 
            class="px-5 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            ${labels[d]}
          </button>`
        )
        .join('')}
    </div>
    <button id="back-to-chapters-btn" class="mt-4 px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700">
      Go Back to Chapter Selection
    </button>`;

  els.reviewScreen.appendChild(wrapper);

  wrapper.addEventListener('click', e => {
    const btn = e.target.closest('button[data-diff]');
    if (btn) {
      const params = new URLSearchParams(window.location.search);
      params.set('difficulty', btn.dataset.diff);
      window.location.href = `quiz-engine.html?${params.toString()}`;
    }
    if (e.target.id === 'back-to-chapters-btn') {
      window.location.href = 'chapter-selection.html';
    }
  });
}

/* -----------------------------------
   VIEW CONTROL
----------------------------------- */
export function showView(viewName) {
  initializeElements();
  const all = [els.quizContent, els.reviewScreen];
  all.forEach(v => v && v.classList.add('hidden'));
  if (viewName === 'quiz-content' && els.quizContent) els.quizContent.classList.remove('hidden');
  if (viewName === 'results-screen' && els.reviewScreen) els.reviewScreen.classList.remove('hidden');
}
