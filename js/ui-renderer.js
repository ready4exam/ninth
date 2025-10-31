// js/ui-renderer.js
import { cleanKatexMarkers } from './utils.js';

let els = {};
let isInit = false;

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
    reviewBtn: document.getElementById('review-complete-btn'),
    authNav: document.getElementById('auth-nav-container'),
    paywallScreen: document.getElementById('paywall-screen'),
    quizContent: document.getElementById('quiz-content'),
    reviewContainer: document.getElementById('review-container')
  };
  isInit = true;
  console.log('[UI] Elements initialized.');
}

export function showStatus(msg, cls = 'text-gray-700') {
  initializeElements();
  els.status.innerHTML = msg;
  els.status.className = `p-3 text-center font-semibold ${cls}`;
  els.status.classList.remove('hidden');
}
export function hideStatus() { els.status.classList.add('hidden'); }
export function updateHeader(topic, diff) {
  if (els.title) els.title.textContent = `${topic.toUpperCase()} Quiz`;
  if (els.diffBadge) els.diffBadge.textContent = `Difficulty: ${diff}`;
}

export function showView(viewName) {
  const views = [els.quizContent, els.reviewScreen, els.paywallScreen];
  views.forEach(v => v && v.classList.add('hidden'));
  if (els[viewName]) els[viewName].classList.remove('hidden');
}

export function renderQuestion(q, idx, selected, submitted) {
  const reason = cleanKatexMarkers(q.explanation || q.scenario_reason || '');
  const qText = cleanKatexMarkers(q.text || '');

  const options = ['A', 'B', 'C', 'D'].map(opt => {
    const txt = cleanKatexMarkers(q.options[opt] || '');
    const isSel = selected === opt;
    const isCorrect = submitted && q.correct_answer === opt;
    const isWrong = submitted && isSel && !isCorrect;
    let cls = 'option-label border-2 rounded-lg p-3';
    if (isCorrect) cls += ' border-green-600 bg-green-50';
    else if (isWrong) cls += ' border-red-600 bg-red-50';
    else if (isSel) cls += ' border-blue-500 bg-blue-50';
    return `
      <label class="block">
        <input type="radio" name="q-${q.id}" value="${opt}" class="hidden" ${isSel ? 'checked' : ''} ${submitted ? 'disabled' : ''}>
        <div class="${cls}"><b>${opt}.</b> ${txt}</div>
      </label>`;
  }).join('');

  els.list.innerHTML = `
    <div class="space-y-5">
      <p class="text-lg font-semibold text-gray-800">Q${idx}: ${qText}</p>
      ${reason && !submitted ? `<p class="italic text-gray-700">${reason}</p>` : ''}
      <div class="space-y-3">${options}</div>
      ${submitted && reason ? `<p class="text-gray-600 mt-3 italic">${reason}</p>` : ''}
    </div>`;

  if (els.counter) els.counter.textContent = `${idx} / ${els._total || '--'}`;
}

export function attachAnswerListeners(handler) {
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

export function updateNavigation(currentIndex, total, submitted) {
  els._total = total;
  const show = (btn, cond) => btn && btn.classList.toggle('hidden', !cond);
  show(els.prevButton, currentIndex > 0);
  show(els.nextButton, currentIndex < total - 1);
  show(els.submitButton, !submitted && currentIndex === total - 1);
  if (els.counter) els.counter.textContent = `${currentIndex + 1} / ${total}`;
}

export function showResults(score, total) {
  els.score.textContent = `${score} / ${total}`;
  showView('reviewScreen');
  renderDifficultyOptions();
}

export function renderAllQuestionsForReview(questions) {
  els.reviewContainer.innerHTML = questions.map((q, i) => `
    <div class="mb-6 p-4 bg-white shadow rounded-lg">
      <p class="font-bold text-lg mb-1">Q${i + 1}: ${cleanKatexMarkers(q.text)}</p>
      ${q.explanation ? `<p class="italic text-gray-700 mb-2">${cleanKatexMarkers(q.explanation)}</p>` : ''}
      <p class="text-green-700 font-semibold">Correct Answer: ${q.correct_answer}</p>
    </div>`).join('');
}

export function renderDifficultyOptions() {
  const container = document.createElement('div');
  container.className = 'mt-6 text-center';
  container.innerHTML = `
    <h3 class="font-semibold mb-3">Try Another</h3>
    <div class="flex justify-center gap-3">
      <button data-diff="simple" class="px-5 py-2 bg-green-500 text-white rounded hover:bg-green-600">Simple</button>
      <button data-diff="medium" class="px-5 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">Medium</button>
      <button data-diff="advanced" class="px-5 py-2 bg-red-500 text-white rounded hover:bg-red-600">Advanced</button>
    </div>
    <button id="back-to-chapters-btn" class="mt-5 px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Choose Another Topic</button>`;
  els.reviewContainer.appendChild(container);

  container.addEventListener('click', e => {
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
