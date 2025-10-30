// js/ui-renderer.js

// --- DOM Element Map (For efficient access) ---
let elements = {};

/**
 * Initializes and retrieves frequently used DOM elements.
 * @returns {Object} An object map of critical DOM elements.
 */
export function getElements() {
    if (Object.keys(elements).length === 0) {
        elements = {
            mainContainer: document.getElementById('main-container'),
            quizTitle: document.getElementById('quiz-title'), // This is the main title element
            quizDifficulty: document.getElementById('quiz-difficulty'), // This is the difficulty element
            statusMessage: document.getElementById('status-message'),
            questionList: document.getElementById('question-list'),
            resultsDisplay: document.getElementById('score-display'),
            paywallContent: document.getElementById('paywall-content'),
            authNav: document.getElementById('auth-nav-container'),
            loginButton: document.getElementById('login-btn'),
            logoutNavBtn: document.getElementById('logout-nav-btn'),
            submitButton: document.getElementById('submit-button'),
            reviewCompleteBtn: document.getElementById('review-complete-btn'),
            viewContainers: {
                'quiz-content': document.getElementById('quiz-content'),
                'results-screen': document.getElementById('results-screen'),
                'paywall-screen': document.getElementById('paywall-screen'),
            }
        };
        // Simple helper to check if all views are present
        if (!elements.viewContainers['quiz-content'] || !elements.viewContainers['results-screen'] || !elements.viewContainers['paywall-screen']) {
            console.error("[UI RENDERER ERROR] One or more main view containers (quiz-content, results-screen, paywall-screen) are missing.");
        }
    }
    return elements;
}

/**
 * Updates the title and difficulty displayed in the quiz header.
 * @param {string} title - The topic title (e.g., "Motion").
 * @param {string} difficulty - The difficulty level ("simple", "medium", "advanced").
 */
export function updateQuizHeader(title, difficulty) {
    const elements = getElements();
    if (elements.quizTitle) {
        elements.quizTitle.textContent = title;
    }
    if (elements.quizDifficulty) {
        // Capitalize the first letter for display
        elements.quizDifficulty.textContent = `Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`;
    }
}

/**
 * Displays a status or error message at the top of the container.
 * @param {string} message - The HTML content of the message.
 * @param {boolean} isError - If true, styles the message as an error.
 */
export function updateStatus(message, isError = true) {
    const elements = getElements();
    if (elements.statusMessage) {
        elements.statusMessage.innerHTML = message;
        elements.statusMessage.classList.remove('hidden');
        elements.statusMessage.classList.add(isError ? 'bg-red-100/70' : 'bg-yellow-100/70', 'p-4', 'rounded-lg', 'shadow-md', 'mb-4');
        elements.statusMessage.classList.remove(isError ? 'bg-yellow-100/70' : 'bg-red-100/70');
    }
}

/**
 * Hides the status message.
 */
export function hideStatus() {
    const elements = getElements();
    if (elements.statusMessage) {
        elements.statusMessage.classList.add('hidden');
        elements.statusMessage.innerHTML = '';
    }
}


// --- View Management ---

/**
 * Switches the main view displayed to the user.
 * @param {('quiz-content'|'results-screen'|'paywall-screen')} viewName - The view to show.
 */
export function switchView(viewName) {
    const elements = getElements();
    if (!elements.viewContainers) return;

    // Iterate through all views and set display based on the requested viewName
    Object.keys(elements.viewContainers).forEach(key => {
        const element = elements.viewContainers[key];
        if (element) {
            if (key === viewName) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        }
    });
}

// --- Question Rendering ---

/**
 * Renders the full list of questions onto the question list container.
 * @param {Array<Object>} questions - The array of quiz questions.
 * @param {Object} userAnswers - The current object of user selections.
 * @param {boolean} isSubmitted - If the quiz has been submitted (for review mode).
 */
export function renderQuestions(questions, userAnswers, isSubmitted) {
    const elements = getElements();
    if (!elements.questionList) return;

    // Clear previous content
    elements.questionList.innerHTML = '';

    questions.forEach((q, index) => {
        const questionHtml = createQuestionCard(q, index, userAnswers[q.id], isSubmitted);
        elements.questionList.insertAdjacentHTML('beforeend', questionHtml);
    });
}

/**
 * Creates the HTML markup for a single question card.
 * @param {Object} question - The question object.
 * @param {number} index - The 0-based index of the question.
 * @param {string|null} userAnswerId - The ID of the option selected by the user, or null.
 * @param {boolean} isSubmitted - Whether the quiz is in review mode.
 * @returns {string} The HTML string for the question card.
 */
function createQuestionCard(question, index, userAnswerId, isSubmitted) {
    const questionNumber = index + 1;
    let optionsHtml = '';

    // Shuffle options for security/fairness, but maintain the stored correct ID
    // Note: We don't shuffle here for simplicity, assuming data is pre-shuffled or order doesn't matter.

    question.options.forEach(option => {
        const optionId = option.id;
        const optionText = option.text;
        const isSelected = userAnswerId === optionId;
        const isCorrectOption = optionId === question.correct_option_id;

        let feedbackClass = '';
        let feedbackIcon = '';
        let checkedAttr = isSelected ? 'checked' : '';
        let disabledAttr = isSubmitted ? 'disabled' : '';

        if (isSubmitted) {
            if (isCorrectOption) {
                // Correct option is marked green
                feedbackClass = 'correct';
                feedbackIcon = '<i data-lucide="check-circle" class="w-5 h-5 text-green-600 ml-auto"></i>';
            } else if (isSelected && !isCorrectOption) {
                // User selected this, but it was wrong
                feedbackClass = 'incorrect';
                feedbackIcon = '<i data-lucide="x-circle" class="w-5 h-5 text-red-600 ml-auto"></i>';
            }
            // If user did not select the correct answer, show the correct one
            if (isCorrectOption && !isSelected) {
                feedbackIcon = '<i data-lucide="check-circle" class="w-5 h-5 text-green-600 ml-auto"></i>';
            }
        }

        optionsHtml += `
            <div class="relative">
                <input type="radio" 
                       id="q${questionNumber}-opt-${optionId}" 
                       name="q${questionNumber}" 
                       value="${optionId}" 
                       class="hidden peer"
                       data-question-id="${question.id}"
                       ${checkedAttr}
                       ${disabledAttr}
                       onchange="window.quizEngine.handleAnswerSelection('${question.id}', '${optionId}')">
                <label for="q${questionNumber}-opt-${optionId}" class="option-label peer-checked:border-cbse-blue ${feedbackClass}">
                    <span class="text-gray-700">${optionText}</span>
                    ${feedbackIcon}
                </label>
            </div>
        `;
    });

    return `
        <div id="q-card-${question.id}" class="question-card bg-white p-6 md:p-8 rounded-xl shadow-lg mb-8 border-t-4 border-cbse-blue/50">
            <h3 class="text-xl font-semibold text-heading mb-4">
                <span class="text-cbse-blue mr-2">Q${questionNumber}.</span> ${question.text}
            </h3>
            <div class="space-y-4">
                ${optionsHtml}
            </div>
            ${isSubmitted && question.explanation ? `
                <div class="mt-6 p-4 bg-gray-50 border-l-4 border-accent-gold rounded-lg">
                    <p class="font-bold text-gray-700">Explanation:</p>
                    <p class="text-sm text-gray-600 mt-1">${question.explanation}</p>
                </div>
            ` : ''}
        </div>
    `;
}

// --- Results and Status Updates ---

/**
 * Updates the score display on the results screen.
 * @param {number} score - The number of correct answers.
 * @param {number} total - The total number of questions.
 */
export function updateScoreDisplay(score, total) {
    const elements = getElements();
    if (elements.resultsDisplay) {
        elements.resultsDisplay.textContent = `${score} / ${total}`;
        // Optionally update color based on performance
        if (score / total < 0.5) {
            elements.resultsDisplay.classList.remove('text-green-600');
            elements.resultsDisplay.classList.add('text-red-600');
        } else {
            elements.resultsDisplay.classList.add('text-green-600');
            elements.resultsDisplay.classList.remove('text-red-600');
        }
    }
}

/**
 * Toggles the visibility of the main Submit button.
 * @param {boolean} show - Whether to show or hide the button.
 */
export function toggleSubmitButton(show) {
    const elements = getElements();
    if (elements.submitButton) {
        if (show) {
            elements.submitButton.classList.remove('hidden');
        } else {
            elements.submitButton.classList.add('hidden');
        }
    }
}

/**
 * Updates the navigation bar elements (login/logout/user).
 * @param {Object|null} user - The Firebase user object or null if logged out.
 */
export function updateAuthUI(user) {
    const elements = getElements();

    if (!elements.authNav || !elements.loginButton || !elements.logoutNavBtn) {
        // This can happen if the elements aren't loaded yet, log a warning
        console.warn("[UI RENDERER] Auth UI elements not found.");
        return;
    }

    if (user && !user.isAnonymous) {
        // User is logged in (via Google)
        elements.loginButton.classList.add('hidden');
        elements.logoutNavBtn.classList.remove('hidden');

        let displayName = user.displayName || 'User';
        let userSnippet = '';

        if (user.photoURL) {
             userSnippet = `<img src="${user.photoURL}" alt="${displayName}" class="w-8 h-8 rounded-full border border-white mr-2">`;
        } else {
             userSnippet = `<i data-lucide="user-circle" class="w-6 h-6 mr-2"></i>`;
        }

        // Show a condensed view of the user's status
        elements.logoutNavBtn.innerHTML = `
            ${userSnippet}
            <span>${displayName}</span>
        `;
        // Ensure Lucide icons are rendered if the user snippet contains one
        if (window.lucide) {
             window.lucide.createIcons();
        }

    } else {
        // User is logged out or anonymous
        elements.loginButton.classList.remove('hidden');
        elements.logoutNavBtn.classList.add('hidden');
        // If the user is anonymous, still give a hint that they are "signed in"
        if (user && user.isAnonymous) {
             elements.loginButton.textContent = 'Sign in for Premium';
             // Optionally show anonymous ID snippet for debugging
             const anonId = user.uid;
             if (elements.authNav) {
                // If we want to show the anonymous ID, we can append it here
                // For simplicity, we just keep the login button for upgrade
             }
        }
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
                <p class="text-gray-600">The **${topic.toUpperCase()}** quiz is part of our premium content.</p>
                <p class="text-sm text-gray-500 mt-4">
                    Please sign in with Google to access this quiz content.
                    Since payment processing is currently disabled, simply signing in will grant you access.
                </p>
                <button id="login-btn-paywall" class="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg">
                    Sign In with Google
                </button>
            </div>
        `;

        // Attach event listener to the newly created button
        const paywallLoginBtn = document.getElementById('login-btn-paywall');
        if (paywallLoginBtn && window.quizEngine && window.quizEngine.handleSignIn) {
            paywallLoginBtn.addEventListener('click', window.quizEngine.handleSignIn);
        }
    }
}
