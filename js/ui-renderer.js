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
    reviewScreen: document.getElementById('results-screen'),
    score: document.getElementById('score-display'),
    reviewBtn: document.getElementById('review-complete-btn'),
  };
  isInit = true;
}

export function showStatus(msg) {
  initializeElements();
  els.status.innerHTML = msg;
  els.status.classList.remove('hidden');
}

export function hideStatus() {
  els.status.classList.add('hidden');
}

export function updateHeader(topic, diff) {
  initializeElements();
  if (els.title) els.title.textContent = `${topic.toUpperCase()} Quiz`;
  if (els.diffBadge) els.diffBadge.textContent = `Difficulty: ${diff}`;
}

/**
 * Render one question
 */
export function renderQuestion(q, idx, selected, submitted) {
  initializeElements();
  const isAR = q.question_type === 'ar' || q.question_type === 'case';
  const qText = cleanKatexMarkers(q.text);
  const reason = cleanKatexMarkers(q.scenario_reason);

  els.list.innerHTML = `
    <div class="space-y-4">
      <p class="text-lg font-bold text-gray-800">Q${idx + 1}: ${qText}</p>
      ${isAR && reason ? `<p class="italic text-gray-700 border-l-4 border-blue-400 pl-4">${reason}</p>` : ''}
      <div class="space-y-3">
        ${['A', 'B', 'C', 'D'].map(opt => {
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
              <input type="radio" name="q-${q.id}" value="${opt}" class="hidden" ${isSel ? 'checked' : ''} ${submitted ? 'disabled' : ''}>
              <div class="${cls}">
                <span class="font-bold mr-2">${opt}.</span> ${text}
              </div>
            </label>`;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * After submission — show all questions with correct answers.
 */
export function renderReview(questions) {
  initializeElements();
  els.list.innerHTML = questions.map((q, i) => `
    <div class="mb-6 p-4 bg-gray-50 rounded-lg border">
      <p class="font-bold text-lg mb-1">Q${i + 1}: ${cleanKatexMarkers(q.text)}</p>
      ${q.scenario_reason ? `<p class="italic text-gray-600 mb-2">${cleanKatexMarkers(q.scenario_reason)}</p>` : ''}
      <p class="text-green-700 font-semibold">Correct Answer: ${q.correct_answer}</p>
    </div>
  `).join('');
  els.reviewScreen.classList.remove('hidden');
}

export function showScore(score, total) {
  initializeElements();
  els.score.textContent = `${score} / ${total}`;
  els.reviewScreen.classList.remove('hidden');
}
