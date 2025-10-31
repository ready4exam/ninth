// js/ui-renderer.js
import { cleanKatexMarkers } from './utils.js';

let els = {};
let isInit = false;

/**
 * Initialize DOM element references
 */
export function initializeElements() {
  if (isInit) return;
  els = {
    title: document.getElementById('quiz-page-title'),
    diffBadge: document.getElementById('difficulty-display'),
    status: document.getElementById('status-message'),
    list: document.getElementById('question-list'),
    counter: document.getElementById('question-counter'),
    reviewScreen: document.getElementById('results-screen'),
    score: document.getElementById('score-display'),
    reviewBtn: document.getElementById('review-complete-btn'),
  };
  isInit = true;
}

/**
 * Status bar helpers
 */
export function showStatus(msg) {
  initializeElements();
  els.status.innerHTML = msg;
  els.status.classList.remove('hidden');
}

export function hideStatus() {
  els.status.classList.add('hidden');
}

/**
 * Header display (topic + difficulty)
 */
export function updateHeader(topic, diff) {
  initializeElements();
  if (els.title) els.title.textContent = `${topic.toUpperCase()} Quiz`;
  if (els.diffBadge) els.diffBadge.textContent = `Difficulty: ${diff}`;
}

/**
 * Render a single question (with Reason if AR/Case)
 */
export function renderQuestion(q, idx, selected, submitted) {
  initializeElements();
  const isAR = q.question_type === 'ar' || q.question_type === 'case';
  const qText = cleanKatexMarkers(q.text);
  const reason = cleanKatexMarkers(q.explanation || ''); // ✅ fixed key name

  els.list.innerHTML = `
    <div class="space-y-4">
      <p class="text-lg font-bold text-gray-800">Q${idx + 1}: ${qText}</p>
      ${
        isAR && reason
          ? `<p class="italic text-gray-700 border-l-4 border-blue-400 pl-4">Reason (R): ${reason}</p>`
          : ''
      }
      <div class="space-y-3">
        ${['A', 'B', 'C', 'D']
          .map(opt => {
            const text = cleanKatexMarkers(q.options[opt]);
            const isSel = selected === opt;
            const isCorrect = submitted && q.correct_answer === opt;
            const isWrong = submitted && isSel && !isCorrect;
            let cls = 'option-label';
            if (isCorrect) cls += ' correct';
            else if (isWrong) cls += ' incorrect';
            else if (isSel) cls += ' border-blue-500 bg-blue-50';
            return `
              <label>
                <input type="radio" name="q-${q.id}" value="${opt}" class="hidden"
                  ${isSel ? 'checked' : ''} ${submitted ? 'disabled' : ''}>
                <div class="${cls}">
                  <span class="font-bold mr-2">${opt}.</span> ${text}
                </div>
              </label>`;
          })
          .join('')}
      </div>
    </div>
  `;
}

/**
 * Review screen showing all questions and correct answers together
 */
export function renderReview(questions) {
  initializeElements();
  els.list.innerHTML = questions
    .map(
      (q, i) => `
    <div class="mb-6 p-4 bg-gray-50 rounded-lg border">
      <p class="font-bold text-lg mb-1">Q${i + 1}: ${cleanKatexMarkers(q.text)}</p>
      ${
        q.explanation
          ? `<p class="italic text-gray-600 mb-2">Reason (R): ${cleanKatexMarkers(
              q.explanation
            )}</p>`
          : ''
      }
      <p class="text-green-700 font-semibold">Correct Answer: ${q.correct_answer}</p>
    </div>
  `
    )
    .join('');
  els.reviewScreen.classList.remove('hidden');
}

/**
 * Display score at end of quiz
 */
export function showScore(score, total) {
  initializeElements();
  els.score.textContent = `${score} / ${total}`;
  els.reviewScreen.classList.remove('hidden');
}

/**
 * Render difficulty retry options at the end
 */
export function renderDifficultyOptions(currentTopic, currentDifficulty) {
  initializeElements();

  const difficulties = ['simple', 'medium', 'advanced'];
  const labels = {
    simple: 'Simple (Easy)',
    medium: 'Medium',
    advanced: 'Advanced (Hard)',
  };

  const nextButtonsHTML = difficulties
    .map(diff => {
      const isCurrent = diff === currentDifficulty;
      const btnClass = isCurrent
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
        : diff === 'simple'
        ? 'bg-green-500 hover:bg-green-600 text-white'
        : diff === 'medium'
        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
        : 'bg-red-500 hover:bg-red-600 text-white';
      return `
        <button
          class="px-6 py-2 rounded-lg font-semibold ${btnClass} transition"
          ${isCurrent ? 'disabled' : ''}
          data-diff="${diff}"
        >
          ${labels[diff]}
        </button>`;
    })
    .join('');

  const newTopicBtn = `
    <button id="back-to-chapters-btn"
      class="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
      Choose Another Topic
    </button>
  `;

  const container = document.createElement('div');
  container.className = 'mt-8 space-y-4 text-center';
  container.innerHTML = `
    <h3 class="text-xl font-bold text-gray-800 mb-3">Try Another Difficulty:</h3>
    <div class="flex justify-center flex-wrap gap-3">${nextButtonsHTML}</div>
    <div class="mt-6">${newTopicBtn}</div>
  `;

  els.reviewScreen.appendChild(container);

  // Event delegation for navigation
  container.addEventListener('click', e => {
    if (e.target.matches('[data-diff]')) {
      const diff = e.target.dataset.diff;
      if (!diff) return;
      const params = new URLSearchParams(window.location.search);
      params.set('difficulty', diff);
      window.location.href = `quiz-engine.html?${params.toString()}`;
    }
    if (e.target.id === 'back-to-chapters-btn') {
      window.location.href = 'chapter-selection.html';
    }
  });
}
