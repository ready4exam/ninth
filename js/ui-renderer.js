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
            resultsDisplay: document.getElementById('results-display'),
            paywallContent: document.getElementById('paywall-content'),
            authNav: document.getElementById('auth-nav-container'),
            loginButton: document.getElementById('login-btn'),
            logoutNavBtn: document.getElementById('logout-nav-btn'),
            submitButton: document.getElementById('submit-btn'),
            viewContainers: {
                'quiz-content': document.getElementById('quiz-content'),
                'results-screen': document.getElementById('results-screen'),
                'paywall-screen': document.getElementById('paywall-screen'),
            }
        };
        // Simple helper to check if all views are present
        if (!elements.viewContainers['quiz-content'] || !elements.viewContainers['results-screen']) {
            console.error("Critical DOM element missing. Check HTML structure.");
        }
    }
    return elements;
}


/**
 * Updates the main quiz header title and difficulty level.
 * @param {string} topicSlug - The current quiz topic slug (e.g., 'motion').
 * @param {string} difficulty - The current quiz difficulty (e.g., 'simple').
 * @param {number | null} [questionCount=null] - The total number of questions.
 */
export function renderTitles(topicSlug, difficulty, questionCount = null) {
    const topic = (topicSlug || 'Undefined').replace(/-/g, ' ').toUpperCase();
    const level = (difficulty || 'Level').toUpperCase();
    const countText = questionCount !== null ? `(${questionCount} Questions)` : '';
    
    const elements = getElements();
    
    // FIX CONFIRMED: Ensures the main header shows the topic and question count
    if (elements.quizTitle) {
        elements.quizTitle.innerHTML = `${topic} Quiz <span class="text-sm font-normal text-gray-500">${countText}</span>`;
    } else {
        console.warn("Element #quiz-title not found.");
    }
    
    // FIX CONFIRMED: Ensures the difficulty badge is updated
    if (elements.quizDifficulty) {
        // Apply responsive text sizing and a slight shadow for aesthetics
        elements.quizDifficulty.className = `inline-block px-3 py-1 text-xs font-semibold leading-none rounded-full shadow-md mt-1 mb-1
            ${difficulty === 'simple' ? 'bg-green-100 text-green-800' : 
            difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
            'bg-red-100 text-red-800'}`;
        elements.quizDifficulty.textContent = level;
    } else {
        console.warn("Element #quiz-difficulty not found.");
    }
}


/**
 * Renders a single question and its options.
 * @param {Object} question - The question object from Supabase.
 * @param {number} index - The zero-based index of the question.
 * @param {string | null} userAnswer - The user's previously selected answer (if any).
 * @param {boolean} isSubmitted - Whether the quiz has been submitted.
 */
export function renderQuestion(question, index, userAnswer, isSubmitted) {
    const qNumber = index + 1;
    const isCorrect = isSubmitted && userAnswer === question.correct_answer;
    const isIncorrect = isSubmitted && userAnswer !== question.correct_answer && userAnswer !== null;

    let optionsHtml = Object.keys(question.options).map(key => {
        const optionValue = question.options[key];
        const isSelected = userAnswer === key;
        const isDisabled = isSubmitted;

        let optionClass = 'flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors duration-200 shadow-sm';
        
        if (!isSubmitted) {
            // Unsubmitted state
            optionClass += ' border-gray-200 hover:border-blue-400 bg-white';
            if (isSelected) {
                 optionClass += ' ring-2 ring-blue-500 border-blue-500';
            }
        } else {
            // Submitted state (show feedback)
            optionClass += ' opacity-80';
            if (key === question.correct_answer) {
                // Correct answer is always marked green
                optionClass = 'flex items-center p-3 rounded-lg border-2 shadow-md bg-green-100 border-green-500 ring-2 ring-green-400';
            } else if (isSelected && isIncorrect) {
                // Incorrectly selected answer is marked red
                optionClass = 'flex items-center p-3 rounded-lg border-2 shadow-md bg-red-100 border-red-500 ring-2 ring-red-400';
            } else {
                 // Unselected/neutral options in submitted state
                 optionClass += ' border-gray-200 bg-white';
            }
        }
        
        return `
            <label class="${optionClass}">
                <input 
                    type="radio" 
                    name="question-${index}" 
                    value="${key}" 
                    class="form-radio h-5 w-5 text-blue-600 transition duration-150 ease-in-out"
                    ${isSelected ? 'checked' : ''}
                    ${isDisabled ? 'disabled' : ''}
                >
                <span class="ml-3 text-sm font-medium text-gray-700">${optionValue}</span>
                ${isSubmitted && key === question.correct_answer ? 
                    `<span class="ml-auto text-green-700 font-bold">✅ Correct Answer</span>` : ''}
            </label>
        `;
    }).join('');

    const feedbackHtml = isSubmitted ? `
        <div class="mt-4 p-4 rounded-lg shadow-inner ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}">
            <p class="font-semibold">${isCorrect ? 'Correct!' : 'Incorrect.'}</p>
        </div>
    ` : '';

    const html = `
        <div id="question-content-display" class="space-y-4">
            <div class="text-lg font-bold text-gray-800">
                Q${qNumber}: ${question.question_text}
            </div>
            <div class="space-y-3">
                ${optionsHtml}
            </div>
            ${feedbackHtml}
        </div>
    `;
    
    const elements = getElements();
    const currentQuestionContainer = elements.questionList;
    
    // Clear previous question content and insert new one
    currentQuestionContainer.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    currentQuestionContainer.appendChild(wrapper.firstChild);
}

/**
 * Updates the status message banner.
 * @param {string} message - The message to display.
 */
export function updateStatus(message) {
    const elements = getElements();
    if (elements.statusMessage) {
        elements.statusMessage.innerHTML = `<div class="p-4 bg-blue-100 text-blue-800 rounded-lg shadow-inner">${message}</div>`;
        elements.statusMessage.classList.remove('hidden');
    }
}

/**
 * Hides the status message banner.
 */
export function hideStatus() {
    const elements = getElements();
    if (elements.statusMessage) {
        elements.statusMessage.innerHTML = '';
        elements.statusMessage.classList.add('hidden');
    }
}

/**
 * Updates the result display on the results screen.
 * @param {number} score - The user's score.
 * @param {number} total - The total number of questions.
 */
export function updateResultDisplay(score, total) {
    const elements = getElements();
    if (elements.resultsDisplay) {
        const percentage = ((score / total) * 100).toFixed(0);
        
        let resultMessage = 'Keep practicing!';
        let resultClass = 'text-red-600 bg-red-100';
        
        if (percentage >= 80) {
            resultMessage = 'Excellent work!';
            resultClass = 'text-green-600 bg-green-100';
        } else if (percentage >= 50) {
            resultMessage = 'Good effort! Room for improvement.';
            resultClass = 'text-yellow-600 bg-yellow-100';
        }

        elements.resultsDisplay.innerHTML = `
            <div class="text-center p-8 space-y-4 rounded-xl shadow-lg border">
                <h2 class="text-3xl font-extrabold text-gray-900">Quiz Results</h2>
                <div class="text-6xl font-black ${resultClass} inline-block px-6 py-3 rounded-full shadow-inner">${percentage}%</div>
                <p class="text-2xl font-semibold text-gray-700">${resultMessage}</p>
                <p class="text-xl text-gray-500">You answered ${score} out of ${total} questions correctly.</p>
                <div class="pt-4">
                    <button onclick="window.location.reload()" class="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 transition duration-150">
                        Try Quiz Again
                    </button>
                </div>
            </div>
        `;
    }
}

/**
 * Toggles visibility between main content views.
 * @param {string} viewName - The ID suffix of the view to show ('quiz-content', 'results-screen', 'paywall-screen').
 */
export function showView(viewName) {
    const elements = getElements();
    Object.keys(elements.viewContainers).forEach(key => {
        const view = elements.viewContainers[key];
        if (view) {
            view.classList.toggle('hidden', key !== viewName);
        }
    });
}

/**
 * Updates the authentication-related UI elements.
 * @param {Object | null} user - The Firebase user object or null.
 */
export function updateAuthUI(user) {
    const elements = getElements();
    
    if (elements.authNav) {
        elements.authNav.classList.remove('hidden'); // Ensure container is visible
    }
    
    if (elements.loginButton) {
        elements.loginButton.classList.toggle('hidden', !!user);
    }
    
    if (elements.logoutNavBtn) {
        // Show logout button and the user's ID if logged in
        elements.logoutNavBtn.classList.toggle('hidden', !user);
        if (user) {
             const userIdEl = document.getElementById('user-id-display');
             if (userIdEl) {
                 // MANDATORY: Show the full userId string
                 userIdEl.textContent = `User: ${user.uid.substring(0, 8)}...`; 
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
                <p class="text-sm text-gray-500">Please sign in to confirm your access or purchase a subscription.</p>
                <button onclick="window.quizEngine.handleSignIn()" class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-lg hover:bg-blue-700 transition duration-150 transform hover:scale-105">
                    Sign In / Get Access
                </button>
            </div>
        `;
    }
}

// Initialize elements on module load
document.addEventListener('DOMContentLoaded', getElements);
