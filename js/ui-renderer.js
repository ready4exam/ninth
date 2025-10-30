// js/ui-renderer.js
import { cleanKatexMarkers } from './utils.js';

let elements = {};
let isInitialized = false;

// --- DOM Initialization ---
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
            'review-screen': document.getElementById('review-screen')
        }
    };
    isInitialized = true;
    console.log("[UI RENDERER] Elements initialized.");
}

export function getElements() {
    if (!isInitialized) initializeElements();
    return elements;
}

// --- Status and Header ---
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

export function updateHeader(topic, difficulty) {
    const e = getElements();
    if (e.quizTitle) e.quizTitle.textContent = topic.replace(/_/g, ' ').toUpperCase();
    if (e.quizDifficulty) e.quizDifficulty.textContent = `Difficulty: ${difficulty}`;
}

export function showView(viewName) {
    const views = getElements().viewContainers;
    Object.keys(views).forEach(v => views[v]?.classList.add('hidden'));
    if (views[viewName]) views[viewName].classList.remove('hidden');
}

// --- Question Rendering ---
export function renderQuestion(question, questionNumber, selectedAnswer, isSubmitted) {
    const e = getElements();
    if (!e.questionList) return;

    const cleanText = cleanKatexMarkers(question.text);
    const explanation = cleanKatexMarkers(question.explanation || '');

    const showExplanation =
        isSubmitted &&
        (question.question_type === 'ar' || question.question_type === 'case') &&
        explanation.trim().length > 0;

    e.questionList.innerHTML = `
        <div class="space-y-6">
            <p class="text-xl font-bold text-heading">Q${questionNumber}: ${cleanText}</p>
            <div id="options-container" class="space-y-3">
                ${['A', 'B', 'C', 'D'].map(optionKey => {
                    const optionText = cleanKatexMarkers(question.options[optionKey]);
                    const isSelected = selectedAnswer === optionKey;
                    const isCorrect = isSubmitted && (optionKey === question.correct_answer);
                    const isIncorrect = isSubmitted && isSelected && !isCorrect;
                    let labelClass = 'option-label';
                    if (isCorrect) labelClass += ' correct border-green-600 bg-green-100';
                    else if (isIncorrect) labelClass += ' incorrect border-red-600 bg-red-100';
                    else if (isSelected) labelClass += ' border-cbse-blue bg-blue-50/50 shadow-md';

                    return `
                        <label>
                            <input type="radio" name="q-${question.id}" value="${optionKey}" class="hidden" 
                                ${isSelected ? 'checked' : ''} ${isSubmitted ? 'disabled' : ''}>
                            <div class="${labelClass}">
                                <span class="w-6 h-6 text-center font-bold mr-4">${optionKey}.</span>
                                <p class="flex-grow">${optionText}</p>
                                ${isSubmitted && isCorrect ? '<span class="text-green-600 font-bold ml-4">✔</span>' : ''}
                                ${isSubmitted && isIncorrect ? '<span class="text-red-600 font-bold ml-4">✖</span>' : ''}
                            </div>
                        </label>`;
                }).join('')}
            </div>
            ${showExplanation ? `
                <div class="mt-4 p-3 border-l-4 border-blue-400 bg-blue-50 text-gray-700 rounded">
                    <p class="font-semibold text-blue-700">Explanation:</p>
                    <p>${explanation}</p>
                </div>` : ''}
        </div>
    `;
}

// --- Review Mode ---
export function renderAllQuestionsForReview(questions, userAnswers) {
    const e = getElements();
    showView('quiz-content');

    if (!e.questionList) return;
    e.questionList.innerHTML = questions.map((q, index) => {
        const selected = userAnswers[q.id];
        const cleanText = cleanKatexMarkers(q.text);
        const explanation = cleanKatexMarkers(q.explanation || '');
        const showExplanation = (q.question_type === 'ar' || q.question_type === 'case') && explanation.trim();

        return `
            <div class="p-6 mb-6 border rounded-xl bg-white shadow-sm">
                <p class="font-bold text-lg mb-3">Q${index + 1}: ${cleanText}</p>
                <div class="space-y-2">
                    ${['A', 'B', 'C', 'D'].map(opt => {
                        const text = cleanKatexMarkers(q.options[opt]);
                        const isCorrect = opt === q.correct_answer;
                        const isSelected = selected === opt;
                        let optClass = 'p-2 rounded border';
                        if (isCorrect) optClass += ' border-green-600 bg-green-100';
                        else if (isSelected) optClass += ' border-red-600 bg-red-100';
                        else optClass += ' border-gray-300';
                        return `<div class="${optClass}"><strong>${opt}.</strong> ${text}</div>`;
                    }).join('')}
                </div>
                ${showExplanation ? `
                    <div class="mt-3 p-3 border-l-4 border-blue-400 bg-blue-50 rounded">
                        <p class="font-semibold text-blue-700">Explanation:</p>
                        <p>${explanation}</p>
                    </div>` : ''}
            </div>`;
    }).join('');
}

// --- Navigation ---
export function updateNavigation(currentIndex, total, isSubmitted) {
    const e = getElements();
    [e.prevButton, e.nextButton, e.submitButton, e.reviewCompleteBtn].forEach(btn => {
        if (btn) btn.classList.add('hidden');
    });
    if (isSubmitted) {
        e.reviewCompleteBtn?.classList.remove('hidden');
    } else {
        if (e.prevButton && currentIndex > 0) e.prevButton.classList.remove('hidden');
        if (e.nextButton && currentIndex < total - 1) e.nextButton.classList.remove('hidden');
        if (e.submitButton && currentIndex === total - 1) e.submitButton.classList.remove('hidden');
    }
}

// --- Auth UI ---
export function updateAuthUI(user) {
    const e = getElements();
    if (!e.authNav) return;
    e.authNav.innerHTML = '';
    if (user) {
        const name = user.displayName || user.email || 'User';
        e.authNav.innerHTML = `
            <span class="text-white text-sm mr-4 hidden sm:inline">Hi, ${name.split(' ')[0]}</span>
            <button id="logout-nav-btn" class="px-4 py-2 text-sm font-semibold rounded-lg bg-accent-gold text-cbse-blue hover:bg-yellow-400">Sign Out</button>
        `;
        e.logoutNavBtn = document.getElementById('logout-nav-btn');
    } else {
        e.authNav.innerHTML = `
            <button id="login-btn" class="px-4 py-2 text-sm font-semibold rounded-lg bg-white text-cbse-blue hover:bg-gray-100">
                Sign In (Google)
            </button>`;
        e.loginButton = document.getElementById('login-btn');
    }
}

// --- Results ---
export function showResults(score, total) {
    const e = getElements();
    if (e.scoreDisplay) e.scoreDisplay.textContent = `${score} / ${total}`;
    showView('results-screen');
}
