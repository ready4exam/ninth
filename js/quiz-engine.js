// js/quiz-engine.js

// Import required modules
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

// --- Helpers ---
function parseUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  quizState.classId = urlParams.get('class');
  quizState.subject = urlParams.get('subject');
  quizState.topicSlug = urlParams.get('topic'); // e.g., 'motion'
  quizState.difficulty = urlParams.get('difficulty'); // e.g., 'simple'

  // If you want to relax the "only motion" constraint, remove this block.
  if (!quizState.topicSlug) {
    UI.showStatus(`<span class="text-red-500">Error:</span> Missing topic parameter.`);
    throw new Error('Missing topic parameter.');
  }

  // Set UI header immediately (safe even if UI hasn't fully rendered)
  try {
    UI.updateHeader(quizState.topicSlug, quizState.difficulty || '--');
  } catch (e) {
    console.warn('[ENGINE] updateHeader failed (non-fatal):', e);
  }
}

/**
 * Render current question
 */
function renderQuestion() {
  const q = quizState.questions[quizState.currentQuestionIndex];
  if (!q) {
    // Nothing to render
    UI.showStatus('<span class="text-gray-600">No question to display.</span>');
    return;
  }

  UI.renderQuestion(q, quizState.currentQuestionIndex + 1, quizState.userAnswers[q.id], quizState.isSubmitted);

  // Update question counter (if UI exposes it)
  try {
    const elements = UI.getElements();
    if (elements.questionCounter) {
      elements.questionCounter.textContent = `${quizState.currentQuestionIndex + 1} / ${quizState.questions.length}`;
    }
  } catch (e) {
    // not fatal
  }

  UI.updateNavigation(quizState.currentQuestionIndex, quizState.questions.length, quizState.isSubmitted);
  UI.hideStatus();
}

/**
 * Navigation
 */
function handleNavigation(direction) {
  const newIndex = quizState.currentQuestionIndex + direction;
  if (newIndex >= 0 && newIndex < quizState.questions.length) {
    quizState.currentQuestionIndex = newIndex;
    renderQuestion();
  }
}

/**
 * Answer selection handler (questionId string, option letter)
 */
function handleAnswerSelection(questionId, selectedOption) {
  if (quizState.isSubmitted) return;
  quizState.userAnswers[questionId] = selectedOption;
  renderQuestion();
}

/**
 * Submit quiz
 */
async function handleSubmit() {
  if (quizState.isSubmitted) return;
  quizState.isSubmitted = true;
  quizState.score = 0;

  quizState.questions.forEach((q) => {
    const userAnswer = quizState.userAnswers[q.id];
    if (userAnswer && userAnswer.toUpperCase() === (q.correct_answer || '').toUpperCase()) {
      quizState.score++;
    }
  });

  // Save result (if user logged-in)
  const user = getAuthUser();
  const resultData = {
    classId: quizState.classId,
    subject: quizState.subject,
    topic: quizState.topicSlug,
    difficulty: quizState.difficulty,
    score: quizState.score,
    total: quizState.questions.length,
    user_answers: quizState.userAnswers,
  };

  if (user) {
    try {
      await saveResult(resultData);
    } catch (e) {
      console.warn('[ENGINE] saveResult failed (non-fatal):', e);
    }
  }

  // Show first question in review mode and show results
  quizState.currentQuestionIndex = 0;
  renderQuestion();
  UI.showResults(quizState.score, quizState.questions.length);

  // render review list (all correct answers view) if UI provides that
  try {
    UI.renderAllQuestionsForReview(quizState.questions, quizState.userAnswers);
  } catch (e) {
    // It's ok if UI doesn't expose that function
  }

  // update navigation for review state
  UI.updateNavigation(quizState.currentQuestionIndex, quizState.questions.length, true);
}

/**
 * Loads quiz questions from API and initializes question state
 */
async function loadQuiz() {
  try {
    UI.showStatus('Fetching questions...', 'text-blue-600');

    const questions = await fetchQuestions(quizState.topicSlug, quizState.difficulty || 'simple');

    if (!questions || questions.length === 0) {
      UI.showStatus(`<span class="text-red-600">Error:</span> No questions found for this topic/difficulty.`, 'text-red-600');
      return;
    }

    quizState.questions = questions;

    // initialize userAnswers keys
    quizState.questions.forEach((q) => {
      quizState.userAnswers[q.id] = quizState.userAnswers[q.id] || null;
    });

    quizState.currentQuestionIndex = 0;
    quizState.isSubmitted = false;
    quizState.score = 0;

    // render first question
    renderQuestion();

    // attach answer listeners delegated through UI helper
    UI.attachAnswerListeners(handleAnswerSelection);

    // show quiz container
    try { UI.showView('quiz-content'); } catch (e) { /* ignore */ }

  } catch (err) {
    console.error('[ENGINE ERROR] loadQuiz failed:', err);
    UI.showStatus(`<span class="text-red-600">ERROR:</span> Could not load quiz. ${err.message}`, 'text-red-600');
  }
}

/**
 * Authentication state change callback
 */
async function onAuthChange(user) {
  try {
    if (user) {
      UI.showStatus(`Checking access for user: ${user.email}...`, 'text-blue-600');

      // show user's first name in header if present
      try {
        const nameElem = document.getElementById('user-name');
        if (nameElem) {
          const email = user.email || '';
          const first = email.split('@')[0] || user.displayName || 'User';
          nameElem.textContent = first;
        }
      } catch (e) {
        // ignore
      }

      // update header auth UI
      try { UI.updateAuthUI(user); } catch (e) { /* ignore */ }

      const hasAccess = await checkAccess(quizState.topicSlug);
      if (hasAccess) {
        await loadQuiz();
      } else {
        try {
          UI.updatePaywallContent(quizState.topicSlug);
          UI.showView('paywall-screen');
        } catch (e) {
          UI.showStatus('Access denied. Please sign in or contact admin.', 'text-yellow-600');
        }
      }
    } else {
      // logged out
      try { UI.updateAuthUI(null); } catch (e) {}
      UI.showStatus('Please sign in to access premium quizzes.', 'text-yellow-600');
      try {
        UI.updatePaywallContent(quizState.topicSlug);
        UI.showView('paywall-screen');
      } catch (e) {}
    }
  } catch (e) {
    console.error('[ENGINE] onAuthChange error:', e);
  }
}

/**
 * Setup UI event bindings robustly.
 */
function attachDomEventHandlers() {
  // Attach to known static elements via UI.getElements() where possible
  let elements;
  try {
    elements = UI.getElements();
  } catch (e) {
    elements = {};
  }

  // Prefer direct listeners when available
  if (elements.prevButton) elements.prevButton.addEventListener('click', () => handleNavigation(-1));
  if (elements.nextButton) elements.nextButton.addEventListener('click', () => handleNavigation(1));
  if (elements.submitButton) elements.submitButton.addEventListener('click', () => handleSubmit());
  if (elements.reviewCompleteBtn) elements.reviewCompleteBtn.addEventListener('click', () => { window.location.href = 'index.html'; });

  // Sign-in / sign-out / paywall buttons: use event delegation with .closest()
  document.addEventListener('click', (e) => {
    const btn = e.target;
    // login buttons (header or paywall)
    if (btn.closest && btn.closest('#login-btn')) {
      signInWithGoogle();
      return;
    }
    if (btn.closest && btn.closest('#google-signin-btn')) {
      // older paywall button id used in some templates
      signInWithGoogle();
      return;
    }
    if (btn.closest && btn.closest('#paywall-login-btn')) {
      signInWithGoogle();
      return;
    }
    // logout
    if (btn.closest && btn.closest('#logout-nav-btn')) {
      signOut();
      return;
    }
  }, { capture: false });
}

/**
 * Initialization sequence
 */
async function initQuizEngine() {
  try {
    // Initialize UI element cache
    UI.initializeElements();

    // Parse parameters (will update header)
    parseUrlParameters();

    // Initialize services (Firebase + Supabase)
    UI.showStatus('Initializing core services...', 'text-blue-600');
    await initializeServices();

    // Initialize auth listener and wait for redirect restoration & initial auth check
    await initializeAuthListener(onAuthChange);

    // Attach DOM handlers for buttons and delegated events
    attachDomEventHandlers();

    // Hide status if nothing else
    UI.hideStatus();

    console.log('[ENGINE] Initialization complete.');
  } catch (err) {
    console.error('[ENGINE FATAL] Initialization failed:', err);
    UI.showStatus(`<span class="text-red-600">CRITICAL ERROR: Initialization Failed.</span><p>${err.message}</p>`);
  }
}

// Start when DOM loaded
document.addEventListener('DOMContentLoaded', initQuizEngine);
