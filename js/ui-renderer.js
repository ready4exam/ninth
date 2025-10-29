// js/ui-renderer.js
// Handles all view rendering and switching logic.
import { signOut } from './auth-paywall.js';

// --- DOM Elements Cache ---
const elements = {
    // Views
    loadingStatus: document.getElementById('loading-status'),
    statusText: document.getElementById('status-text'),
    paywallScreen: document.getElementById('paywall-screen'),
    quizContent: document.getElementById('quiz-content'),
    resultsScreen: document.getElementById('results-screen'),
    
    // Header/Branding
    quizPageTitle: document.getElementById('quiz-page-title'),
    difficultyDisplay: document.getElementById('difficulty-display'),
    logoutNavBtn: document.getElementById('logout-nav-btn'),

    // Quiz Elements
    questionContainer: document.getElementById('question-container'), // New element
    questionCounter: document.getElementById('question-counter'),     // New element
    prevBtn: document.getElementById('prev-btn'),                     // New element
    nextBtn: document.getElementById('next-btn'),                     // New element
    submitButton: document.getElementById('submit-button'),
    
    // Paywall Elements
    accessRequiredItem: document.getElementById('access-required-item'),
    loginButton: document.getElementById('login-button'),
    payButton: document.getElementById('pay-button'),
    
    // Results
    scoreDisplay: document.getElementById('score-display'),
    reviewCompleteBtn: document.getElementById('review-complete-btn'),
};

// Map of view names to their DOM elements
const views = {
    'loading-status': elements.loadingStatus,
    'paywall-screen': elements.paywallScreen,
    'quiz-content': elements.quizContent,
    'results-screen': elements.resultsScreen,
};

/**
 * Hides all views and shows the specified one.
 * @param {string} viewName - The ID of the view to show.
 */
export function showView(viewName) {
    Object.values(views).forEach(el => {
        if (el) el.classList.add('hidden');
    });
    if (views[viewName]) {
        views[viewName].classList.remove('hidden');
    }
}

/**
 * Updates the status text displayed on the loading screen.
 * @param {string} text 
 */
export function updateStatus(text) {
    if (elements.statusText) elements.statusText.textContent = text;
}

/**
 * Sets the main quiz page branding titles.
 * @param {string} topicTitle - The display name of the topic.
 * @param {string} difficulty - The difficulty level ('simple', 'medium', 'advanced').
 * @param {string} subject - The subject name (e.g., 'Science').
 */
export function renderTitles(topicTitle, difficulty, subject) {
    if (elements.quizPageTitle) {
        elements.quizPageTitle.textContent = `${topicTitle} Quiz`;
    }
    if (elements.difficultyDisplay) {
        const d = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
        elements.difficultyDisplay.innerHTML = `${subject.replace('_', ' ')} | <span class="font-bold text-gray-700">${d} Difficulty</span>`;
    }
}

/**
 * Renders a single question into the question container.
 * @param {Object} question - The question object.
 * @param {number} index - The 0-based index of the question.
 * @param {number} total - The total number of questions.
 * @param {string | null} userAnswer - The user's previously saved answer.
 * @param {boolean} isSubmitted - If true, show correct/incorrect feedback.
 */
export function renderQuestion(question, index, total, userAnswer, isSubmitted) {
    if (!elements.questionContainer) return;

    // Determine the question type title for display
    let typeTitle = '';
    if (question.type === 'mcq') typeTitle = 'Multiple Choice Question';
    else if (question.type === 'assertion_reasoning') typeTitle = 'Assertion & Reason';
    else if (question.type === 'case_study') typeTitle = 'Case Study Based Question';
    else typeTitle = question.type; // Fallback

    const optionsHtml = question.options.map((option, optionIndex) => {
        const optionId = `q${index}_opt${optionIndex}`;
        const isChecked = userAnswer === option;
        
        let feedbackClass = '';
        const isCorrect = option === question.correct_answer;

        if (isSubmitted) {
            if (isCorrect) {
                feedbackClass = 'correct';
            } else if (isChecked && !isCorrect) {
                feedbackClass = 'incorrect';
            }
        }

        return `
            <div class="flex items-center space-x-3">
                <input type="radio" 
                       id="${optionId}" 
                       name="question_${index}" 
                       value="${option}" 
                       class="radio-input"
                       ${isChecked ? 'checked' : ''}
                       ${isSubmitted ? 'disabled' : ''}
                >
                <label for="${optionId}" class="option-label ${feedbackClass}">
                    <!-- Custom radio indicator -->
                    <div class="h-5 w-5 rounded-full border-2 mr-3 flex items-center justify-center transition-all duration-150 
                                ${isChecked && !isSubmitted ? 'bg-cbse-blue border-cbse-blue' : isChecked && isCorrect ? 'bg-green-600 border-green-600' : isChecked && !isCorrect ? 'bg-red-600 border-red-600' : 'bg-white border-gray-400'}">
                        <div class="h-2 w-2 rounded-full ${isChecked ? 'bg-white' : 'bg-transparent'}"></div>
                    </div>
                    <!-- Option Text -->
                    <span class="text-base">${option}</span>
                </label>
            </div>
        `;
    }).join('');

    const contentHtml = `
        <div class="mb-6 border-b pb-4 border-gray-100">
            <span class="question-index-tag">${typeTitle}</span>
            ${question.case_study_text ? `<p class="mt-4 text-sm italic text-gray-600 bg-gray-50 p-3 rounded-lg border-l-2 border-gray-300">${question.case_study_text}</p>` : ''}
        </div>
        
        <h3 class="text-xl font-semibold text-gray-800 mb-6">${question.question_text}</h3>
        
        <div class="space-y-4">
            ${optionsHtml}
        </div>
        
        ${isSubmitted ? `<div class="mt-6 p-4 ${userAnswer === question.correct_answer ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'} border rounded-lg">
            <p class="font-bold">Correct Answer: ${question.correct_answer}</p>
        </div>` : ''}
    `;

    elements.questionContainer.innerHTML = contentHtml;
}


/**
 * Updates the question counter and navigation button states.
 * @param {number} current - The current 0-based index.
 * @param {number} total - The total number of questions.
 * @param {boolean} isSubmitted - Flag to show/hide the submit button and control navigation text.
 */
export function updateNavigation(current, total, isSubmitted) {
    const isFirst = current === 0;
    const isLast = current === total - 1;

    if (elements.questionCounter) {
        elements.questionCounter.textContent = `${current + 1} / ${total}`;
    }

    if (elements.prevBtn) {
        elements.prevBtn.disabled = isFirst;
        elements.prevBtn.classList.toggle('opacity-50', isFirst);
    }

    if (elements.nextBtn) {
        elements.nextBtn.classList.remove('hidden');
        if (isLast) {
            elements.nextBtn.classList.add('hidden'); // Hide Next on last question
        }
    }
    
    if (elements.submitButton) {
        // Show Submit button ONLY on the last question AND if not submitted
        elements.submitButton.classList.toggle('hidden', !isLast || isSubmitted);
    }

    // In Review Mode (isSubmitted is true), we adjust the buttons for navigation
    if (isSubmitted) {
        if (elements.nextBtn) elements.nextBtn.textContent = 'Review Next';
        if (elements.submitButton) elements.submitButton.classList.add('hidden'); // Ensure submit is hidden in review
        // Show 'Next' even on the last question during review, but only if it's not the actual last question.
        if (elements.nextBtn) {
            elements.nextBtn.classList.remove('hidden');
            if(isLast) elements.nextBtn.classList.add('hidden'); // Ensure it's hidden on the *very* last question
        }
    } else {
        if (elements.nextBtn) elements.nextBtn.textContent = 'Next';
    }
}


/**
 * Updates the score display on the results screen.
 * @param {number} score 
 * @param {number} total 
 */
export function updateResultDisplay(score, total) {
    if (elements.scoreDisplay) {
        elements.scoreDisplay.textContent = `${score} / ${total}`;
    }
}

/**
 * Updates the header UI based on user authentication status.
 * @param {Object|null} user 
 */
export function updateAuthUI(user) {
    if (elements.logoutNavBtn) {
        if (user) {
            elements.logoutNavBtn.classList.remove('hidden');
            elements.logoutNavBtn.textContent = `🚪 Logout (${user.displayName || user.email || 'User'})`;
        } else {
            elements.logoutNavBtn.classList.add('hidden');
            elements.logoutNavBtn.textContent = `🚪 Logout`; // Reset if user logs out
        }
    }
}

/**
 * Updates the paywall screen content with the topic name.
 * @param {string} topic - The name of the chapter/topic.
 */
export function updatePaywallContent(topic) {
    if (elements.accessRequiredItem) {
        elements.accessRequiredItem.textContent = topic;
    }
}

/**
 * Exposes elements cache for event listeners in quiz-engine.js.
 * @returns {Object} The cached DOM elements.
 */
export function getElements() {
    return elements;
}
