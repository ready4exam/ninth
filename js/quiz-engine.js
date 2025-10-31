// js/quiz-engine.js

import { initializeServices, getAuthUser } from './config.js';
import { fetchQuestions, saveResult } from './api.js';
import * as UI from './ui-renderer.js';
import { checkAccess, initializeAuthListener, signInWithGoogle, signOut } from './auth-paywall.js';

// --- Global state ---
let quizState = {
  classId: null,
  subject: null,
  topicSlug: null,
  difficulty: null,
  questions: [],
  currentQuestionIndex: 0,
  userAnswers: {},
  isSubmitted: false,
  score: 0,
};

// parse URL params
function parseUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  quizState.classId = urlParams.get('class');
  quizState.subject = urlParams.get('subject');
  quizState.topicSlug = urlParams.get('topic');
  quizState.difficulty = urlParams.get('difficulty') || 'simple';

  if (!quizState.topicSlug) {
    UI.showStatus(`<span class="text-red-500">Error:</span> Missing topic parameter.`);
    throw new Error('Missing topic parameter.');
  }

  // Update header immediately
  UI.updateHeader(quizState.topicSlug, quizState.difficulty);
}

function renderQuestion() {
  const q = quizState.questions[quizState.currentQuestionIndex];
  if (!q) {
    UI.showStatus('<span class="text-gray-600">No question to display.</span>');
    return;
  }
  // pass 1-based index to UI.renderQuestion
  UI.renderQuestion(q, quizState.currentQuestionIndex + 1, quizState.userAnswers[q.id], quizState.isSubmitted);
  UI.updateNavigation(quizState.currentQuestionIndex, quizState.questions.length, quizState.isSubmitted);
  UI.hideStatus();
}

function handleNavigation(direction) {
  const newIndex = quizState.currentQuestionIndex + direction;
  if (newIndex >= 0 && newIndex < quizState.questions.length) {
    quizState.currentQuestionIndex = newIndex;
    renderQuestion();
  }
}

function handleAnswerSelection(questionId, selectedOption) {
  if (quizState.isSubmitted) return;
  quizState.userAnswers[questionId] = selectedOption;
  renderQuestion();
}

async function handleSubmit() {
  if (quizState.isSubmitted) return;
  quizState.isSubmitted = true;
  quizState.score = 0;

  quizState.questions.forEach(q => {
    const ua = (quizState.userAnswers[q.id] || '').toUpperCase();
    const ca = (q.correct_answer || '').toUpperCase();
    if (ua && ua === ca) quizState.score++;
  });

  const resultData = {
    classId: quizState.classId,
    subject: quizState.subject,
    topic: quizState.topicSlug,
    difficulty: quizState.difficulty,
    score: quizState.score,
    total: quizState.questions.length,
    user_answers: quizState.userAnswers,
  };

  const user = getAuthUser();
  if (user) {
    try { await saveResult(resultData); } catch (e) { console.warn('[ENGINE] saveResult failed:', e); }
  }

  // Show results and review list
  UI.showResults(quizState.score, quizState.questions.length);
  UI.renderAllQuestionsForReview(quizState.questions, quizState.userAnswers);
  UI.updateNavigation(quizState.currentQuestionIndex, quizState.questions.length, true);
}

async function loadQuiz() {
  try {
    UI.showStatus('Fetching questions...', 'text-blue-600');

    const questions = await fetchQuestions(quizState.topicSlug, quizState.difficulty);

    if (!questions || questions.length === 0) {
      UI.showStatus(`<span class="text-red-600">Error:</span> No questions found for this topic/difficulty.`, 'text-red-600');
      return;
    }

    quizState.questions = questions;

    // initialize userAnswers keys (preserve existing answers if any)
    quizState.questions.forEach(q => {
      if (!(q.id in quizState.userAnswers)) quizState.userAnswers[q.id] = null;
    });

    quizState.currentQuestionIndex = 0;
    quizState.isSubmitted = false;
    quizState.score = 0;

    // show quiz content
    UI.showView('quiz-content');
    renderQuestion();

    // attach listeners
    UI.attachAnswerListeners(handleAnswerSelection);

  } catch (err) {
    console.error('[ENGINE ERROR] loadQuiz failed:', err);
    UI.showStatus(`<span class="text-red-600">ERROR:</span> Could not load quiz. ${err.message}`, 'text-red-600');
  }
}

/**
 * called when auth state changes
 */
async function onAuthChange(user) {
  try {
    if (user) {
      UI.showStatus(`Checking access for user: ${user.email}...`, 'text-blue-600');

      // show user's first name in header if present
      try {
        UI.updateAuthUI(user);
      } catch (e) {}

      const hasAccess = await checkAccess(quizState.topicSlug);
      if (hasAccess) {
        // Hide any auth loading overlay if present
        UI.hideAuthLoading();
        await loadQuiz();
      } else {
        UI.updatePaywallContent(quizState.topicSlug);
        UI.showView('paywall-screen');
      }
    } else {
      UI.updateAuthUI(null);
      UI.showStatus('Please sign in to access premium quizzes.', 'text-yellow-600');
      UI.updatePaywallContent(quizState.topicSlug);
      UI.showView('paywall-screen');
    }
  } catch (e) {
    console.error('[ENGINE] onAuthChange error:', e);
  }
}

/**
 * attach DOM handlers
 */
function attachDomEventHandlers() {
  const elements = UI.getElements();

  if (elements.prevButton) elements.prevButton.addEventListener('click', () => handleNavigation(-1));
  if (elements.nextButton) elements.nextButton.addEventListener('click', () => handleNavigation(1));
  if (elements.submitButton) elements.submitButton.addEventListener('click', () => handleSubmit());

  // Review button shows review list (it already renders)
  if (elements.reviewCompleteBtn) {
    elements.reviewCompleteBtn.addEventListener('click', () => {
      UI.renderAllQuestionsForReview(quizState.questions, quizState.userAnswers);
    });
  }

  // "Back to chapters" UI: create/handle
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.closest && t.closest('#login-btn')) {
      // show polished auth overlay then start sign-in
      UI.showAuthLoading('Preparing Google Sign-In...');
      signInWithGoogle().catch(err => {
        console.error('[ENGINE] signInWithGoogle failed:', err);
        UI.hideAuthLoading();
        UI.showStatus('Sign-in failed. Try again.', 'text-red-600');
      });
    }
    if (t && t.closest && t.closest('#paywall-login-btn')) {
      UI.showAuthLoading('Preparing Google Sign-In...');
      signInWithGoogle().catch(err => {
        console.error('[ENGINE] signInWithGoogle failed:', err);
        UI.hideAuthLoading();
        UI.showStatus('Sign-in failed. Try again.', 'text-red-600');
      });
    }
    if (t && t.closest && t.closest('#logout-nav-btn')) {
      // sign out and show paywall
      signOut().then(() => {
        UI.updateAuthUI(null);
        UI.showView('paywall-screen');
      }).catch(err => {
        console.error('[ENGINE] signOut failed:', err);
      });
    }
    if (t && t.id === 'back-to-chapters-btn') {
      window.location.href = 'chapter-selection.html';
    }
  });
}

/**
 * initialization
 */
async function initQuizEngine() {
  try {
    UI.initializeElements();
    parseUrlParameters();

    UI.showStatus('Initializing core services...', 'text-blue-600');
    await initializeServices();

    // initialize auth listener (auth module handles redirect/popup)
    UI.showAuthLoading('Checking existing session...');
    await initializeAuthListener(onAuthChange);

    // once listener set up, hide overlay (onAuthChange will re-hide as well)
    UI.hideAuthLoading();

    attachDomEventHandlers();
    UI.hideStatus();

    console.log('[ENGINE] Initialization complete.');
  } catch (err) {
    console.error('[ENGINE FATAL] Initialization failed:', err);
    UI.showStatus(`<span class="text-red-600">CRITICAL ERROR: Initialization Failed.</span><p>${err.message}</p>`);
    UI.hideAuthLoading();
  }
}

document.addEventListener('DOMContentLoaded', initQuizEngine);
