// js/ui-renderer.js
import { cleanKatexMarkers } from './utils.js';

let els = {};
let isInit = false;

function normalizeReasonText(txt) {
  if (!txt) return '';
  // Remove duplicate prefixes, keep the actual reason text
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
    statusOverlayId: 'auth-loading-overlay' // used by auth loader
  };

  // Ensure review container exists in results-screen (if not, create)
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
    const text = (typeof topic === 'string' && topic.length) ? `${topic.replace(/_/g, ' ').toUpperCase()} Quiz` : 'Ready4Exam Quiz';
    els.title.textContent = text;
  }
  if (els.diffBadge) els.diffBadge.textContent = `Difficulty: ${diff || '--'}`;
}

/* -----------------------------------
   AUTH LOADING OVERLAY
   (professional sign-in loading state)
----------------------------------- */
export function showAuthLoading(message = 'Signing you in — please wait...') {
  initializeElements();

  let overlay = document.getElementById('auth-loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'auth-loading-overlay';
    overlay.className = 'fixed inset-0 bg-white/80 flex items-center justify-center z-50';
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
        <div class="text-xs text-gray-500 mt-2">
          If the flow doesn't continue, check your popup/redirect settings or try again.
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    const msgEl = overlay.querySelector('.text-sm.text-gray-700');
    if (msgEl) msgEl.textContent = message;
    overlay.classList.remove('hidden');
  }
}
  // if overlay exists, update text
  let overlay = document.getElementById(els.statusOverlayId);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = els.statusOverlayId;
    overlay.className = 'fixed inset-0 bg-white/80 flex items-center justify-center z-50';
    overlay.innerHTML = `
      <div class="p-6 rounded-lg shadow-lg text-center max-w-lg">
        <div class="text-2xl font-bold mb-2">Signing in</div>
        <div class="text-sm text-gray-700 mb-4">${message}</div>
        <div class="w-12 h-12 mx-auto mb-1">
          <svg class="animate-spin w-12 h-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
        </div>
        <div class="text-xs text-gray-500">If the flow doesn't continue, check your popup/redirect settings or try again.</div>
      </div>`;
    document.body.appendChild(overlay);
  } else {
    overlay.querySelector('div.text-sm')?.textContent = message;
    overlay.classList.remove('hidden');
  }
}
export function hideAuthLoading() {
  const overlay = document.getElementById(els.statusOverlayId);
  if (overlay) overlay.remove();
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
export function renderQuestion(q, idxOneBased, selected, submitted) {
  // idxOneBased expected to be 1-based index (1..N)
  initializeElements();
  if (!els.list) return;

  const type = (q.question_type || '').toLowerCase();
  const isARorCase = type === 'ar' || type === 'case';
  const qText = cleanKatexMarkers(q.text || '');
  // explanation stored in q.explanation (normalized by API). Remove duplicate prefixes:
  let reasonRaw = q.explanation || q.scenario_reason || '';
  reasonRaw = normalizeReasonText(cleanKatexMarkers(reasonRaw));
  const reason = reasonRaw;

  // Use consistent styling for reasoning (no blue border), consistent font
  const reasonHtml = (isARorCase && reason) && !submitted
    ? `<p class="italic text-gray-700 mt-2 mb-3">${reason}</p>`
    : '';

  // If submitted, explanation shown below in a subtle box (same font)
  const submittedExplanationHtml = (submitted && isARorCase && reason)
    ? `<div class="mt-3 p-3 bg-gray-50 rounded text-gray-700 border border-gray-100"><b>Explanation:</b> ${reason}</div>`
    : '';

  const optionsHtml = ['A','B','C','D'].map(opt => {
    const txt = cleanKatexMarkers(q.options?.[opt] || '');
    const isSel = selected === opt;
    const isCorrect = submitted && (q.correct_answer || '').toUpperCase() === opt;
    const isWrong = submitted && isSel && !isCorrect;

    let cls = 'option-label flex items-start p-3 border-2 rounded-lg cursor-pointer transition';
    if (isCorrect) cls += ' border-green-600 bg-green-50';
    else if (isWrong) cls += ' border-red-600 bg-red-50';
    else if (isSel) cls += ' border-blue-500 bg-blue-50';

    return `
      <label class="block">
        <input type="radio" name="q-${q.id}" value="${opt}" class="hidden" ${isSel ? 'checked' : ''} ${submitted ? 'disabled' : ''}>
        <div class="${cls}">
          <span class="font-bold mr-3">${opt}.</span>
          <span class="text-gray-800">${txt}</span>
        </div>
      </label>`;
  }).join('');

  // render using idxOneBased as shown number
  els.list.innerHTML = `
    <div class="space-y-6">
      <p class="text-lg font-bold text-gray-800">Q${idxOneBased}: ${qText}</p>
      ${reasonHtml}
      <div class="space-y-3">${optionsHtml}</div>
      ${submittedExplanationHtml}
    </div>`;

  // counter update uses stored _total
  if (els.counter) {
    const total = els._total || '--';
    els.counter.textContent = `${idxOneBased} / ${total}`;
  }
}

/* -----------------------------------
   ANSWER LISTENERS
----------------------------------- */
export function attachAnswerListeners(handler) {
  initializeElements();
  if (!els.list) return;

  if (els._listener) els.list.removeEventListener('change', els._listener);
  const listener = e => {
    if (e.target && e.target.type === 'radio' && e.target.name && e.target.name.startsWith('q-')) {
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
export function updateNavigation(currentIndexZeroBased, totalQuestions, submitted) {
  initializeElements();
  els._total = totalQuestions;

  const show = (btn, cond) => btn && btn.classList.toggle('hidden', !cond);

  // show prev/next based on index
  show(els.prevButton, currentIndexZeroBased > 0);
  show(els.nextButton, currentIndexZeroBased < totalQuestions - 1);
  show(els.submitButton, !submitted && currentIndexZeroBased === totalQuestions - 1);
  show(els.reviewCompleteBtn, submitted);

  if (els.counter) els.counter.textContent = `${currentIndexZeroBased + 1} / ${totalQuestions}`;
}

/* -----------------------------------
   RESULTS + REVIEW
----------------------------------- */
export function showResults(score, total) {
  initializeElements();
  if (els.score) els.score.textContent = `${score} / ${total}`;
  showView('results-screen');
}

export function renderAllQuestionsForReview(questions, userAnswers = {}) {
  initializeElements();
  if (!els.reviewContainer) return;

  const html = questions.map((q, i) => {
    const txt = cleanKatexMarkers(q.text || '');
    const reason = cleanKatexMarkers(q.explanation || '');
    const cleanedReason = normalizeReasonText(reason);
    const ua = (userAnswers[q.id] || '-');
    const ca = q.correct_answer || '-';
    const correct = ua && ua.toUpperCase() === ca.toUpperCase();
    return `
      <div class="mb-6 p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
        <p class="font-bold text-lg mb-1">Q${i+1}: ${txt}</p>
        ${cleanedReason ? `<p class="italic text-gray-700 mb-2">${cleanedReason}</p>` : ''}
        <p>Your Answer: <span class="${correct ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}">${ua}</span></p>
        <p>Correct Answer: <b class="text-green-700">${ca}</b></p>
      </div>`;
  }).join('');

  els.reviewContainer.innerHTML = html;
  showView('results-screen');
}

/* -----------------------------------
   AUTH UI (sign in/out)
----------------------------------- */
export function updateAuthUI(user) {
  initializeElements();
  if (!els.authNav) return;
  if (user) {
    const name = user.displayName ? user.displayName.split(' ')[0] : (user.email ? user.email.split('@')[0] : 'User');
    els.authNav.innerHTML = `
      <span class="text-sm mr-2 text-gray-700">Hi, ${name}</span>
      <button id="logout-nav-btn" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Sign Out</button>
    `;
  } else {
    els.authNav.innerHTML = `
      <button id="login-btn" class="px-4 py-2 bg-white text-cbse-blue rounded hover:bg-gray-100">Sign In (Google)</button>
    `;
  }
}

/* -----------------------------------
   PAYWALL
----------------------------------- */
export function updatePaywallContent(topic) {
  initializeElements();
  if (!els.paywallContent) return;
  els.paywallContent.innerHTML = `
    <div class="p-8 bg-yellow-50 border-l-4 border-yellow-500 rounded">
      <h2 class="text-xl font-bold mb-2">Access Restricted</h2>
      <p>This quiz on <b>${topic.replace(/_/g,' ').toUpperCase()}</b> is for signed-in users only.</p>
      <button id="paywall-login-btn" class="mt-4 px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700">Sign In to Unlock</button>
    </div>`;
}
