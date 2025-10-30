// js/ui-renderer.js
import { cleanKatexMarkers } from './utils.js'; // NEW: Import the cleaning utility

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
            currentQNum: document.getElementById('current-q-num'), // NEW
            totalQNum: document.getElementById('total-q-num'), // NEW
            scoreDisplay: document.getElementById('score-display'), // NEW
            statusMessage: document.getElementById('status-message'),
            questionList: document.getElementById('question-list'),
            paywallContent: document.getElementById('paywall-content'),
            authNav: document.getElementById('auth-nav-container'),
            loginButton: document.getElementById('login-btn'),
            logoutNavBtn: document.getElementById('logout-nav-btn'),
            // NOTE: ID corrected from 'submit-button' to 'submit-btn'
            submitButton: document.getElementById('submit-btn'), 
            viewContainers: {
                'quiz-content': document.getElementById('quiz-content'),
                'results-screen': document.getElementById('results-screen'),
                'paywall-screen': document.getElementById('paywall-screen'),
                // NEW: status screen added
                'status-screen': document.getElementById('status-screen'),
            }
        };
        // Simple helper to check if all views are present
        if (!elements.viewContainers['quiz-content'] || !elements.viewContainers['results-screen'] || !elements.viewContainers['paywall-screen']) {
             console.error("[UI RENDERER] One or more critical view containers are missing from the HTML.");
        }
    }
    return elements;
}

/**
 * Switches the main view displayed in the container.
 * @param {('quiz-content'|'results-screen'|'paywall-screen'|'status-screen')} activeView - The ID of the view to show.
 */
export function switchView(activeView) {
    const elements = getElements();
    Object.keys(elements.viewContainers).forEach(viewId => {
        const viewEl = elements.viewContainers[viewId];
        if (viewEl) {
            if (viewId === activeView) {
                viewEl.classList.remove('hidden');
                // Ensure the main container is ready for the quiz content if it's the quiz view
                if (activeView === 'quiz-content' || activeView === 'results-screen') {
                    elements.mainContainer.classList.remove('flex-col', 'items-center');
                }
            } else {
                viewEl.classList.add('hidden');
            }
        }
    });
}

/**
 * Updates the global quiz header metadata (title, difficulty).
 * @param {string} title - The topic title.
 * @param {string} difficulty - The difficulty level.
 */
export function updateQuizMetadata(title, difficulty) {
    const elements = getElements();
    if (elements.quizTitle) {
         // Display title: e.g., 'Class 9 Science: Motion'
         elements.quizTitle.textContent = cleanKatexMarkers(title); 
    }
    if (elements.quizDifficulty) {
        elements.quizDifficulty.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    }
}

/**
 * Updates the question numbering display.
 * @param {number} current - Current question number (1-based index).
 * @param {number} total - Total number of questions.
 */
export function updateQuestionNumber(current, total) {
    const elements = getElements();
    if (elements.currentQNum) elements.currentQNum.textContent = current;
    if (elements.totalQNum) elements.totalQNum.textContent = total;
}

/**
 * Updates the status message displayed on the status screen.
 * @param {string} htmlContent - HTML string for the status message.
 */
export function updateStatus(htmlContent) {
    const elements = getElements();
    if (elements.statusMessage) {
        elements.statusMessage.innerHTML = htmlContent;
        switchView('status-screen');
    }
}

/**
 * Hides the status screen and shows the main quiz content screen.
 */
export function hideStatus() {
     switchView('quiz-content');
}


/**
 * Renders the score on the results screen.
 * @param {number} score - The user's score.
 * @param {number} total - The total possible score.
 */
export function updateScoreDisplay(score, total) {
    const elements = getElements();
    if (elements.scoreDisplay) {
        elements.scoreDisplay.textContent = `${score} / ${total}`;
    }
    switchView('results-screen');
}


/**
 * Creates the HTML structure for a single question card.
 * @param {Object} question - The question object.
 * @param {number} index - The 0-based index of the question.
 * @param {Object} userAnswer - The user's stored answer for this question.
 * @param {boolean} isSubmitted - Whether the quiz has been submitted (for feedback).
 * @returns {HTMLElement} The question card div.
 */
export function createQuestionCard(question, index, userAnswer, isSubmitted) {
    const card = document.createElement('div');
    card.id = `question-card-${index}`;
    card.className = 'question-card bg-white p-6 rounded-xl quiz-container-shadow space-y-4';

    // Apply Katex cleaning to the question text
    const cleanedQuestionText = cleanKatexMarkers(question.question_text);
    
    // --- Question Number and Text ---
    card.innerHTML = `
        <p class="text-lg font-bold text-gray-800">
            Q${index + 1}. <span class="text-sm font-normal text-cbse-blue ml-2">(${question.question_type.toUpperCase()})</span>
        </p>
        <div class="text-lg text-heading font-medium" style="white-space: pre-wrap;">${cleanedQuestionText}</div>
    `;
    
    // --- Explanation/Scenario Block (Conditional) ---
    // NEW: Only display explanation/scenario for AR and Case-Based questions.
    if (question.question_type === 'ar' || question.question_type === 'case') {
        const scenarioReasonText = cleanKatexMarkers(question.scenario_reason_test || question.scenario_reason_text || '');
        const headerText = question.question_type === 'ar' ? 'Assertion/Reason' : 'Scenario/Case';

        card.innerHTML += `
            <div class="p-4 bg-cbse-light rounded-lg border border-gray-300">
                <p class="text-sm font-semibold text-cbse-blue mb-1">${headerText}:</p>
                <p class="text-gray-700 text-sm" style="white-space: pre-wrap;">${scenarioReasonText}</p>
            </div>
        `;
    }

    // --- Options List ---
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'space-y-3';

    question.options.forEach((option, optionIndex) => {
        // Apply Katex cleaning to the option text
        const cleanedOptionText = cleanKatexMarkers(option.text);
        const optionId = `q${index}-opt${optionIndex}`;
        const inputId = `q${index}-input-${optionIndex}`;
        const isSelected = userAnswer && userAnswer.selectedOption === option.id;
        
        let labelClass = 'option-label';
        
        if (isSubmitted) {
            const isCorrectOption = option.id === question.correct_option_id;
            
            if (isCorrectOption) {
                labelClass += ' correct';
            } else if (isSelected) {
                // User selected this, and it's not the correct one
                labelClass += ' incorrect';
            }
            
            // Highlight the correct/incorrect selection more prominently
            if (isSelected && isCorrectOption) {
                labelClass += ' selected-correct';
            } else if (isSelected) {
                labelClass += ' selected-incorrect';
            }
        }
        
        optionsContainer.innerHTML += `
            <div class="flex items-start">
                <input type="radio" id="${inputId}" name="q${index}" data-option-id="${option.id}" 
                    class="hidden peer" ${isSelected ? 'checked' : ''} ${isSubmitted ? 'disabled' : ''}>
                <label for="${inputId}" class="${labelClass} w-full">
                    <span class="text-gray-600 font-semibold mr-3">(${String.fromCharCode(65 + optionIndex)})</span>
                    <span class="text-gray-800 flex-grow" style="white-space: pre-wrap;">${cleanedOptionText}</span>
                </label>
            </div>
        `;
    });

    card.appendChild(optionsContainer);
    
    // --- Final Explanation (After Submission) ---
    if (isSubmitted) {
        const finalExplanationText = cleanKatexMarkers(question.final_explanation);

        if (finalExplanationText) {
             card.innerHTML += `
                <div class="mt-4 p-4 bg-green-50 rounded-lg border border-green-300">
                    <p class="text-sm font-semibold text-green-700 mb-1">Detailed Explanation:</p>
                    <p class="text-gray-700 text-sm" style="white-space: pre-wrap;">${finalExplanationText}</p>
                </div>
            `;
        }
    }

    return card;
}

/**
 * Updates the authentication UI based on the user object.
 * @param {Object|null} user - The Firebase user object or null.
 */
export function updateAuthUI(user) {
    const elements = getElements();
    const isLoggedIn = user && !user.isAnonymous;
    
    if (elements.loginButton) {
        elements.loginButton.classList.toggle('hidden', isLoggedIn);
    }

    if (elements.logoutNavBtn) {
        // Display a logout button if logged in, and if the user is not anonymous
        // In the final app, this button will likely be part of a profile dropdown
        elements.logoutNavBtn.classList.toggle('hidden', !isLoggedIn);
        if (isLoggedIn && user.email) {
             // Show a snippet of the user's email or a default message
             elements.logoutNavBtn.textContent = `Logout (${user.email.substring(0, 8)}...)`; 
        } else if (isLoggedIn) {
             elements.logoutNavBtn.textContent = `Logout`; 
        }
    }
}


/**
 * Updates the content displayed on the paywall screen.
 * @param {string} topic - The topic slug requiring payment.
 */
export function updatePaywallContent(topic) {
    const elements = getElements();
    const topicDisplay = topic ? cleanKatexMarkers(topic.replace(/_/g, ' ').toUpperCase()) : 'PREMIUM';
    
    if (elements.paywallContent) {
        elements.paywallContent.innerHTML = `
            <div class="p-8 text-center space-y-4 bg-gray-50 rounded-xl shadow-inner">
                <svg class="w-12 h-12 text-yellow-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                <h2 class="text-2xl font-bold text-gray-800">Access Restricted</h2>
                <p class="text-gray-600">The **${topicDisplay}** quiz is part of our premium content.</p>
                <p class="text-sm text-gray-500">Please sign in to access this feature.</p>
            </div>
        `;
    }
}
