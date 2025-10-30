// js/ui-renderer.js
import { cleanKatexMarkers } from './utils.js';

// --- DOM Element Map (For efficient access) ---
let elements = {};
let isInitialized = false;

/**
 * Initializes and caches DOM elements.
 */
export function initializeElements() {
    if (isInitialized) return;

    elements = {
        mainContainer: document.getElementById('main-container'),
        quizTitle: document.getElementById('quiz-title'),
        quizDifficulty: document.getElementById('quiz-difficulty'),
        statusMessage: document.getElementById('status-message'),
        questionList: document.getElementById('question-list'),
        resultsDisplay: document.getElementById('results-display'),
        paywallContent: document.getElementById('paywall-content'),
        authNav: document.getElementById('auth-nav-container'),
        loginButton: document.getElementById('login-btn'),
        logoutNavBtn: document.getElementById('logout-nav-btn'),
        submitButton: document.getElementById('submit-btn'),
        reviewCompleteBtn: document.getElementById('review-complete-btn'),
        scoreDisplay: document.getElementById('score-display'),
        prevButton: document.getElementById('prev-btn'),
        nextButton: document.getElementById('next-btn'),
        viewContainers: {
            'quiz-content': document.getElementById('quiz-content'),
            'results-screen': document.getElementById('results-screen'),
            'paywall-screen': document.getElementById('paywall-screen'),
        }
    };

    if (!elements.mainContainer) {
        console.warn("[UI RENDERER] Main container not found. Check HTML structure.");
    }

    isInitialized = true;
    console.log("[UI RENDERER] Elements initialized.");
}

export function getElements() {
    if (!isInitialized) initializeElements();
    return elements;
}

// --- Status and View Management ---
export function showStatus(message, className = "text-gray-600") {
    const el = getElements().statusMessage;
    if (el) {
        el.innerHTML = message;
        el.className = `p-4 text-center font-semibold ${className}`;
        el.classList.remove('hidden');
    }
}

export function hideStatus() {
    const el = getElements().statusMessage;
    if (el) el.classList.add('hidden');
}

export function showView(viewName) {
    const views = getElements().viewContainers;
    Object.keys(views).forEach(key => views[key]?.classList.add('hidden'));
    views[viewName]?.classList.remove('hidden');
}

export function updateHeader(topic, difficulty) {
    const el = getElements();
    if (el.quizTitle) el.quizTitle.textContent = topic.replace(/_/g, ' ').toUpperCase();
    if (el.quizDifficulty)
        el.quizDifficulty.textContent = `Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`;
}

// --- Question Rendering ---
export function renderQuestion(question, questionNumber, selectedAnswer, isSubmitted) {
    const el = getElements();
    if (!el.questionList) return;

    // 🧼 Clean text and options
    const questionText = cleanKatexMarkers(question.text || question.question_text);
    const options = question.options || {};

    el.questionList.innerHTML = `
        <div class="space-y-6">
            <p class="text-xl font-bold text-heading">Q${questionNumber}: ${questionText}</p>
            <div id="options-container" class="space-y-3">
                ${['A', 'B', 'C', 'D'].map(optionKey => {
                    const optionText = cleanKatexMarkers(options[optionKey] || '');
                    const isSelected = selectedAnswer === optionKey;
                    const isCorrect = isSubmitted && (optionKey === question.correct_answer);
                    const isIncorrect = isSubmitted && isSelected && (optionKey !== question.correct_answer);

                    let labelClass = 'option-label';
                    if (isCorrect) labelClass += ' correct border-green-600 bg-green-100';
                    else if (isIncorrect) labelClass += ' incorrect border-red-600 bg-red-100';
                    else if (isSelected && !isSubmitted)
                        labelClass = 'option-label border-cbse-blue bg-blue-50/50 shadow-md';

                    return `
                        <label>
                            <input type="radio" name="q-${question.id}" value="${optionKey}" class="hidden"
                                ${isSelected ? 'checked' : ''} ${isSubmitted ? 'disabled' : ''}>
                            <div class="${labelClass}">
                                <span class="w-6 h-6 text-center font-bold mr-4 ${isSelected && !isSubmitted ? 'text-cbse-blue' : 'text-gray-600'}">${optionKey}.</span>
                                <p class="flex-grow">${optionText}</p>
                                ${isSubmitted && isCorrect ? '<span class="text-green-600 font-bold ml-4">Correct</span>' : ''}
                                ${isSubmitted && isIncorrect ? '<span class="text-red-600 font-bold ml-4">Your Answer</span>' : ''}
                            </div>
                        </label>
                    `;
                }).join('')}
            </div>

            ${
                (question.question_type === 'ar' || question.question_type === 'case') && isSubmitted
                    ? `
                <div class="explanation bg-blue-50 border-l-4 border-blue-400 p-3 mt-4">
                    <strong>Explanation:</strong>
                    <p>${cleanKatexMarkers(question.explanation || question.scenario_reason_test || '')}</p>
                </div>
              `
                    : ''
            }
        </div>
    `;
}

// --- Review and Navigation ---
export function renderAllQuestionsForReview(questions, userAnswers) {
    showView('quiz-content');
}

export function updateNavigation(currentIndex, totalQuestions, isSubmitted) {
    const el = getElements();
    [el.prevButton, el.nextButton, el.submitButton].forEach(btn => btn?.classList.add('hidden'));

    if (isSubmitted) {
        if (el.prevButton && currentIndex > 0) el.prevButton.classList.remove('hidden');
        if (el.nextButton && currentIndex < totalQuestions - 1) el.nextButton.classList.remove('hidden');
        if (el.reviewCompleteBtn) el.reviewCompleteBtn.classList.remove('hidden');
    } else {
        if (el.prevButton && currentIndex > 0) el.prevButton.classList.remove('hidden');
        if (el.nextButton && currentIndex < totalQuestions - 1) el.nextButton.classList.remove('hidden');
        if (el.submitButton && currentIndex === totalQuestions - 1) el.submitButton.classList.remove('hidden');
    }
}

// --- Answer and Review Listeners ---
export function attachAnswerListeners(handler) {
    const el = getElements();
    el.questionList?.addEventListener('change', e => {
        const radio = e.target;
        if (radio.type === 'radio' && radio.name.startsWith('q-')) {
            const questionId = radio.name.substring(2);
            handler(questionId, radio.value);
        }
    });
}

export function attachReviewListeners(handler) {
    console.log("[UI RENDERER] Review navigation controls confirmed ready.");
}

// --- Results ---
export function showResults(score, total) {
    const el = getElements();
    if (el.scoreDisplay) el.scoreDisplay.textContent = `${score} / ${total}`;
    showView('results-screen');
}

// --- Auth / Paywall UI ---
export function updateAuthUI(user) {
    const el = getElements();
    if (!el.authNav) return;

    el.authNav.innerHTML = '';

    if (user) {
        let displayName = user.displayName || user.email || 'User';
        if (user.isAnonymous) displayName = `Anonymous: ${user.uid.substring(0, 4)}...`;

        el.authNav.innerHTML = `
            <span class="text-white text-sm mr-4 hidden sm:inline">Welcome, ${displayName.split(' ')[0]}</span>
            <button id="logout-nav-btn" class="px-4 py-2 text-sm font-semibold rounded-lg bg-accent-gold text-cbse-blue hover:bg-yellow-400 transition">
                Sign Out
            </button>
        `;
        el.logoutNavBtn = document.getElementById('logout-nav-btn');
        el.loginButton = null;
    } else {
        el.authNav.innerHTML = `
            <button id="login-btn" class="px-4 py-2 text-sm font-semibold rounded-lg bg-white text-cbse-blue hover:bg-gray-100 transition">
                Sign In (Google)
            </button>
        `;
        el.loginButton = document.getElementById('login-btn');
        el.logoutNavBtn = null;
    }
}

export function updatePaywallContent(topic) {
    const el = getElements();
    if (!el.paywallContent) return;

    el.paywallContent.innerHTML = `
        <div class="p-8 text-center space-y-4 bg-gray-50 rounded-xl shadow-inner">
            <svg class="w-12 h-12 text-yellow-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 class="text-2xl font-bold text-gray-800">Access Restricted</h2>
            <p class="text-gray-600">The <strong>${topic.toUpperCase().replace(/_/g, ' ')}</strong> quiz is part of our premium content. Please sign in to access.</p>
            <button id="paywall-login-btn" class="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
                Sign In to Unlock
            </button>
            <p class="text-sm text-gray-500">Access is currently available to authenticated users only.</p>
        </div>
    `;

    const btn = document.getElementById('paywall-login-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            document.getElementById('login-btn')?.click();
        });
    }
}
