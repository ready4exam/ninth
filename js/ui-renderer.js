// js/ui-renderer.js
import { cleanKatexMarkers } from './utils.js';

let els = {};
let isInit = false;

/* ------------------------
   INITIALIZATION
------------------------ */
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
    loadingScreen: document.getElementById('loading-screen'),
  };
  isInit = true;
  console.log('[UI] Elements initialized.');
}

export function getElements() {
  if (!isInit) initializeElements();
  return els;
}

/* ------------------------
   STATUS + HEADER
------------------------ */
export function showStatus(msg, cls = 'text-gray-700') {
  initializeElements();
  els.status.innerHTML = msg;
  els.status.className = `p-3 text-center font-semibold ${cls}`;
  els.status.classList.remove('hidden');
}
export function hideStatus() {
  initializeElements();
  els.status.classList.add('hidden');
}
export function updateHeader(topic, diff) {
  initializeElements();
  if (els.title)
    els.title.textContent = `${topic.replace(/_/g, ' ').toUpperCase()} Quiz`;
  if (els.diffBadge) els.diffBadge.textContent = `Difficulty: ${diff}`;
}

/* ------------------------
   VIEW CONTROL
------------------------ */
export function showView(view) {
  initializeElements();
  const all = [els.quizContent, els.reviewScreen, els.loadingScreen];
  all.forEach(v => v && v.classList.add('hidden'));
  if (view === 'quiz-content') els.quizContent?.classList.remove('hidden');
  if (view === 'results-screen') els.reviewScreen?.classList.remove('hidden');
  if (view === 'loading') els.loadingScreen?.classList.remove('hidden');
}

/* ------------------------
   QUESTION RENDERING
------------------------ */
export function renderQuestion(q, index, selected, submitted) {
  initializeElements();
  const qNum = index + 1;
  const qType = (q.question_type || '').toLowerCase();
  const isCase = qType === 'case';
  const label = isCase ? 'Context' : 'Reasoning (R)';
  const reason = cleanKatexMarkers(q.scenario_reason || q.explanation || '');
  const showReason =
    (qType === 'ar' || qType === 'case') &&
    reason &&
    !q.text.toLowerCase().includes(reason.toLowerCase());

  const qText = cleanKatexMarkers(q.text || '');
  const options = ['A', 'B', 'C', 'D']
    .map(opt => {
      const txt = cleanKatexMarkers(q.options[opt] || '');
      const isSel = selected === opt;
      const isCorrect = submitted && q.correct_answer === opt;
      const isWrong = submitted && isSel && !isCorrect;

      let cls =
        'option-label block p-3 border-2 rounded-lg cursor-pointer transition';
      if (isCorrect) cls += ' border-green-600 bg-green-50';
      else if (isWrong) cls += ' border-red-600 bg-red-50';
      else if (isSel) cls += ' border-blue-500 bg-blue-50';
      else cls += ' border-gray-300';

      return `
        <label class="block">
          <input type="radio" name="q-${q.id}" value="${opt}" class="hidden" ${
        isSel ? 'checked' : ''
      } ${submitted ? 'disabled' : ''}>
          <div class="${cls}">
            <span class="font-bold mr-2">${opt}.</span> ${txt}
          </div>
        </label>`;
    })
    .join('');

  els.list.innerHTML = `
    <div class="space-y-5 text-gray-800 font-sans">
      <p class="text-lg font-semibold">Q${qNum}: ${qText}</p>
      ${
        showReason && !submitted
          ? `<p class="italic text-gray-700">${label}: ${reason}</p>`
          : ''
      }
      <div class="space-y-2">${options}</div>
      ${
        submitted && showReason
          ? `<div class="mt-3 p-3 bg-gray-50 rounded"><b>${label}:</b> ${reason}</div>`
          : ''
      }
    </div>`;
  els.counter.textContent = `${qNum} / ${els._total || '--'}`;
}

/* ------------------------
   ANSWER EVENTS
------------------------ */
export function attachAnswerListeners(handler) {
  initializeElements();
  if (els._listener) els.list.removeEventListener('change', els._listener);
  const listener = e => {
    if (e.target.type === 'radio') {
      const qid = e.target.name.substring(2);
      handler(qid, e.target.value);
    }
  };
  els.list.addEventListener('change', listener);
  els._listener = listener;
}

/* ------------------------
   NAVIGATION
------------------------ */
export function updateNavigation(index, total, submitted) {
  initializeElements();
  els._total = total;
  const show = (btn, cond) => btn && btn.classList.toggle('hidden', !cond);
  show(els.prevButton, index > 0);
  show(els.nextButton, index < total - 1);
  show(els.submitButton, !submitted && index === total - 1);
  show(els.reviewCompleteBtn, submitted);
  els.counter.textContent = `${index + 1} / ${total}`;
}

/* ------------------------
   REVIEW
------------------------ */
export function renderAllQuestionsForReview(questions, userAnswers = {}) {
  initializeElements();
  const html = questions
    .map((q, i) => {
      const qType = (q.question_type || '').toLowerCase();
      const label = qType === 'case' ? 'Context' : 'Reasoning (R)';
      const reason = cleanKatexMarkers(q.scenario_reason || q.explanation || '');
      const ua = userAnswers[q.id] || '-';
      const ca = q.correct_answer || '-';
      const correct = ua === ca;
      return `
        <div class="mb-6 p-5 bg-gray-50 rounded-lg border border-gray-200">
          <p class="font-semibold text-gray-900 mb-1">Q${i + 1}: ${cleanKatexMarkers(
        q.text
      )}</p>
          ${reason ? `<p class="italic text-gray-700 mb-2">${label}: ${reason}</p>` : ''}
          <p>Your Answer: <span class="${
            correct ? 'text-green-600 font-bold' : 'text-red-600 font-bold'
          }">${ua}</span></p>
          <p>Correct Answer: <b class="text-green-700">${ca}</b></p>
        </div>`;
    })
    .join('');
  els.list.innerHTML = html;
}

/* ------------------------
   SCORE & RETRY
------------------------ */
export function showResults(score, total) {
  initializeElements();
  els.score.textContent = `${score} / ${total}`;
  showView('results-screen');
  renderDifficultyOptions();
}

export function renderDifficultyOptions() {
  initializeElements();
  const diffs = ['simple', 'medium', 'advanced'];
  const labels = {
    simple: 'Simple (Easy)',
    medium: 'Medium',
    advanced: 'Advanced (Hard)',
  };
  const wrap = document.createElement('div');
  wrap.className = 'mt-6 text-center';
  wrap.innerHTML = `
    <h3 class="text-lg font-semibold mb-3">Try Another Quiz</h3>
    <div class="flex justify-center gap-3 flex-wrap">
      ${diffs
        .map(
          d =>
            `<button data-diff="${d}" class="px-5 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">${labels[d]}</button>`
        )
        .join('')}
    </div>
    <button id="back-to-chapters-btn" class="mt-5 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">Back to Chapter Selection</button>`;
  els.reviewScreen.appendChild(wrap);

  wrap.addEventListener('click', e => {
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

/* ------------------------
   AUTH UI
------------------------ */
export function updateAuthUI(user) {
  initializeElements();
  if (!els.authNav) return;
  if (user) {
    const name =
      user.displayName?.split(' ')[0] ||
      user.email?.split('@')[0] ||
      'User';
    els.authNav.innerHTML = `
      <span class="text-white text-sm mr-2">Hi, ${name}</span>
      <button id="logout-nav-btn" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Sign Out</button>`;
  } else {
    els.authNav.innerHTML = `
      <button id="login-btn" class="px-4 py-2 bg-white text-cbse-blue rounded hover:bg-gray-100">Sign In (Google)</button>`;
  }
}
