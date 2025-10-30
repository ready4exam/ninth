// js/ui-renderer.js

// --- DOM Element Map (For efficient access) ---
let elements = {};
let isInitialized = false;

/**
 * Initializes all frequently used DOM elements and caches them.
 * This function is now explicitly exported and called by quiz-engine.js.
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
        reviewCompleteBtn: document.getElementById('review-complete-btn'), // Added for completeness
        scoreDisplay: document.getElementById('score-display'), // Added for completeness
        prevButton: document.getElementById('prev-btn'), // Added for completeness
        nextButton: document.getElementById('next-btn'), // Added for completeness
        viewContainers: {
            'quiz-content': document.getElementById('quiz-content'),
            'results-screen': document.getElementById('results-screen'),
            'paywall-screen': document.getElementById('paywall-screen'),
        }
    };
    
    // Simple check to help debugging
    if (!elements.mainContainer) {
         console.warn("[UI RENDERER] Main container not found. Check HTML structure.");
    }
    
    isInitialized = true;
    console.log("[UI RENDERER] Elements initialized.");
}

/**
 * Retrieves the cached DOM elements map. Forces initialization if not done yet.
 * @returns {Object} An object map of critical DOM elements.
 */
export function getElements() {
    if (!isInitialized) {
        initializeElements(); // Ensure elements are initialized on first access
    }
    return elements;
}

// --- Status and View Management ---

/**
 * Shows a status message at the top of the main container.
 */
export function showStatus(message, className = "text-gray-600") {
    const elements = getElements();
    if (elements.statusMessage) {
        elements.statusMessage.innerHTML = message;
        elements.statusMessage.className = `p-4 text-center font-semibold ${className}`;
        elements.statusMessage.classList.remove('hidden');
    }
}

/**
 * Hides the status message.
 */
export function hideStatus() {
    const elements = getElements();
    if (elements.statusMessage) {
        elements.statusMessage.classList.add('hidden');
    }
}

/**
 * Shows a specific view container and hides all others.
 * @param {string} viewName - The key of the view container to show ('quiz-content', 'results-screen', 'paywall-screen').
 */
export function showView(viewName) {
    const views = getElements().viewContainers;
    Object.keys(views).forEach(key => {
        if (views[key]) {
            views[key].classList.add('hidden');
        }
    });

    if (views[viewName]) {
        views[viewName].classList.remove('hidden');
    } else {
        console.error(`[UI RENDERER] View container '${viewName}' not found.`);
    }
}

/**
 * Updates the quiz header title and difficulty.
 */
export function updateHeader(topic, difficulty) {
    const elements = getElements();
    if (elements.quizTitle) {
        elements.quizTitle.textContent = topic.replace(/_/g, ' ').toUpperCase();
    }
    if (elements.quizDifficulty) {
        elements.quizDifficulty.textContent = `Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`;
    }
}

// --- Question Rendering and Interaction ---

/**
 * Renders a single question.
 */
export function renderQuestion(question, questionNumber, selectedAnswer, isSubmitted) {
    const elements = getElements();
    if (!elements.questionList) return;

    elements.questionList.innerHTML = `
        <div class="space-y-6">
            <p class="text-xl font-bold text-heading">Q${questionNumber}: ${question.text}</p>
            <div id="options-container" class="space-y-3">
                ${['A', 'B', 'C', 'D'].map(optionKey => {
                    const optionText = question.options[optionKey];
                    const isSelected = selectedAnswer === optionKey;
                    const isCorrect = isSubmitted && (optionKey === question.correct_answer);
                    const isIncorrect = isSubmitted && isSelected && (optionKey !== question.correct_answer);
                    
                    let labelClass = 'option-label';
                    if (isCorrect) {
                        labelClass += ' correct border-green-600 bg-green-100';
                    } else if (isIncorrect) {
                        labelClass += ' incorrect border-red-600 bg-red-100';
                    } else if (isSelected) {
                        // Regular selected style if not submitted
                        labelClass = 'option-label border-cbse-blue bg-blue-50/50 shadow-md';
                    }

                    return `
                        <label>
                            <input type="radio" name="q-${question.id}" value="${optionKey}" class="hidden" ${isSelected ? 'checked' : ''} ${isSubmitted ? 'disabled' : ''}>
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
        </div>
    `;
}

/**
 * Renders a summary review screen (shows all questions).
 * NOTE: Since the quiz-engine is designed to review one by one, this function
 * is simplified to just set the current question index to 0 for review start.
 */
export function renderAllQuestionsForReview(questions, userAnswers) {
    // In this specific implementation, we just make sure the user is viewing the quiz-content area
    // to begin review of the first question, as the submit action has already calculated the score.
    showView('quiz-content');
}


/**
 * Updates the visibility and state of navigation and submit buttons.
 */
export function updateNavigation(currentIndex, totalQuestions, isSubmitted) {
    const elements = getElements();
    
    // Hide all navigation elements initially
    [elements.prevButton, elements.nextButton, elements.submitButton].forEach(btn => {
        if (btn) btn.classList.add('hidden');
    });

    if (isSubmitted) {
        // After submission, show navigation for review (if you intend to review questions one by one)
        // If viewing first question, hide prev. If viewing last, hide next.
        if (currentIndex > 0) elements.prevButton.classList.remove('hidden');
        if (currentIndex < totalQuestions - 1) elements.nextButton.classList.remove('hidden');

    } else {
        // During quiz
        if (currentIndex > 0) elements.prevButton.classList.remove('hidden');
        if (currentIndex < totalQuestions - 1) elements.nextButton.classList.remove('hidden');
        if (currentIndex === totalQuestions - 1) elements.submitButton.classList.remove('hidden');
    }
}

/**
 * Attaches event delegation listener for answer selection.
 */
export function attachAnswerListeners(handler) {
    const elements = getElements();
    if (elements.questionList) {
        elements.questionList.addEventListener('change', (e) => {
            const radio = e.target;
            if (radio.type === 'radio' && radio.name.startsWith('q-')) {
                const questionId = radio.name.substring(2); 
                handler(questionId, radio.value);
            }
        });
    }
}

/**
 * Attaches event listeners for review navigation.
 * NOTE: Navigation buttons are already attached in quiz-engine.js's init.
 */
export function attachReviewListeners(handler) {
    // Buttons are already attached in initQuizEngine, no need to re-attach here
    // This function serves as a placeholder to confirm review controls are ready.
    console.log("[UI RENDERER] Review navigation listeners confirmed.");
}

// --- Results Management ---

/**
 * Displays the final score on the results screen.
 */
export function showResults(score, total) {
    const elements = getElements();
    if (elements.scoreDisplay) {
        elements.scoreDisplay.textContent = `${score} / ${total}`;
    }
    showView('results-screen');
}


// --- Auth and Paywall UI ---

/**
 * Updates the authentication area in the navigation bar.
 * @param {Object} user - The Firebase user object (or null).
 */
export function updateAuthUI(user) {
    const elements = getElements();
    if (!elements.authNav) return;
    
    // Clear the current navigation content
    elements.authNav.innerHTML = '';

    if (user) {
        // User is logged in
        let displayName = user.email || 'User';
        if (user.displayName) {
            displayName = user.displayName;
        } else if (user.isAnonymous) {
            displayName = `Anonymous: ${user.uid.substring(0, 4)}...`;
        }

        elements.authNav.innerHTML = `
            <span class="text-white text-sm mr-4 hidden sm:inline">Welcome, ${displayName.split(' ')[0]}</span>
            <button id="logout-nav-btn" class="px-4 py-2 text-sm font-semibold rounded-lg bg-accent-gold text-cbse-blue hover:bg-yellow-400 transition">
                Sign Out
            </button>
        `;
        // Re-get the new logout button to attach the event listener in quiz-engine.js
        elements.logoutNavBtn = document.getElementById('logout-nav-btn');
        
    } else {
        // User is logged out
        elements.authNav.innerHTML = `
            <button id="login-btn" class="px-4 py-2 text-sm font-semibold rounded-lg bg-white text-cbse-blue hover:bg-gray-100 transition">
                Sign In (Google)
            </button>
        `;
        // Re-get the new login button to attach the event listener in quiz-engine.js
        elements.loginButton = document.getElementById('login-btn');
    }
}

/**
 * Updates the content displayed on the paywall screen.
 * @param {string} topic - The topic slug requiring payment.
 */
export function updatePaywallContent(topic) {
    const elements = getElements();
    if (elements.paywallContent) {
        elements.paywallContent.innerHTML = `
            <div class="p-8 text-center space-y-4 bg-gray-50 rounded-xl shadow-inner">
                <svg class="w-12 h-12 text-yellow-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                <h2 class="text-2xl font-bold text-gray-800">Access Restricted</h2>
                <p class="text-gray-600">The **${topic.toUpperCase().replace(/_/g, ' ')}** quiz is part of our premium content. Please sign in or subscribe to access.</p>
                <button id="paywall-login-btn" class="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">
                    Sign In to Unlock
                </button>
                <p class="text-sm text-gray-500">Note: Currently, access is only granted to authenticated (non-anonymous) users.</p>
            </div>
        `;
        // Attach listener to the new login button created in the paywall content
        const paywallLoginBtn = document.getElementById('paywall-login-btn');
        if (paywallLoginBtn) {
            // NOTE: The handler for this button needs to be attached in quiz-engine.js
            paywallLoginBtn.addEventListener('click', () => {
                // Since this module doesn't know the handler, we trigger the one on the main login button (if it exists)
                const mainLoginBtn = document.getElementById('login-btn');
                if (mainLoginBtn) mainLoginBtn.click();
            });
        }
    }
}
