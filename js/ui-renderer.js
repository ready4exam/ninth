// js/ui-renderer.js

// --- DOM Element Map (For efficient access) ---\n
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
             console.error("[UI RENDERER ERROR] Missing critical view containers in quiz-engine.html.");
        }
    }
    return elements;
}

/**
 * Helper to strip KaTeX/LaTeX markers as requested by the user.
 * It removes single ($) and double ($$) delimiters.
 * @param {string} text - The text possibly containing KaTeX/LaTeX markers.
 * @returns {string} - The cleaned text.
 */
export function stripKatexMarkers(text) {
    if (typeof text !== 'string') return '';
    // Remove inline math ($...$) and display math ($$...$$) markers
    // This is a simple strip; in a full LMS, this would be a KaTeX render.
    let cleaned = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, p1) => p1.trim()); // Remove $$...$$
    cleaned = cleaned.replace(/\$([^\$]*)\$/g, (match, p1) => p1.trim()); // Remove $...$
    return cleaned;
}

/**
 * Updates the authentication UI in the header/nav based on the user state.
 * @param {firebase.User|null} user - The authenticated user object or null.
 */
export function updateAuthUI(user) {
    const elements = getElements();
    if (elements.authNav && elements.loginButton && elements.logoutNavBtn) {
        const userIdDisplay = document.getElementById('user-id-display');
        const userEmailDisplay = document.getElementById('user-email-display');
        
        // Hide/Show Auth buttons
        elements.loginButton.classList.toggle('hidden', user && !user.isAnonymous);
        elements.logoutNavBtn.classList.toggle('hidden', !user || user.isAnonymous);

        if (user && !user.isAnonymous) {
            // User is signed in with Google
            const uid = user.uid;
            const email = user.email || 'N/A';
            
            // NOTE: Displaying the FULL UID is MANDATORY for canvas multi-user support.
            if (userIdDisplay) {
                 userIdDisplay.textContent = `UID: ${uid}`;
                 userIdDisplay.classList.remove('hidden');
            }
            if (userEmailDisplay) {
                 userEmailDisplay.textContent = `Email: ${email}`;
                 userEmailDisplay.classList.remove('hidden');
            }
        } else {
            // User is not signed in or is anonymous
            if (userIdDisplay) userIdDisplay.classList.add('hidden');
            if (userEmailDisplay) userEmailDisplay.classList.add('hidden');
        }
    }
}

/**
 * Renders a single question card, handling different question types.
 * @param {Object} question - The question data.
 * @param {number} index - The 0-based index of the question.
 * @param {boolean} isSubmitted - Whether the quiz has been submitted.
 * @param {number} userAnswer - The user's selected answer index.
 * @returns {string} - The HTML string for the question card.
 */
export function renderQuestion(question, index, isSubmitted, userAnswer) {
    const questionNumber = index + 1;
    const isAROrCase = question.question_type === 'AR' || question.question_type === 'Case-Based';
    const isCorrect = isSubmitted && (userAnswer === question.correct_option_index);
    const feedbackClass = isSubmitted ? (isCorrect ? 'border-green-600 bg-green-100' : 'border-red-600 bg-red-100') : 'border-gray-200';

    // 1. Clean the main question text
    const cleanQuestionText = stripKatexMarkers(question.question_text);
    
    // 2. Clean the scenario/reason text (only if applicable)
    const cleanScenarioText = isAROrCase && question.scenario_reason_test
        ? stripKatexMarkers(question.scenario_reason_test) 
        : '';

    // HTML for the optional AR/Case-Based scenario box
    const scenarioBox = isAROrCase ? `
        <div class="p-4 mb-4 text-sm bg-blue-50 border-l-4 border-blue-400 text-gray-700 rounded-r-lg">
            <p class="font-semibold">${question.question_type} Scenario/Statement:</p>
            <p class="mt-1">${cleanScenarioText}</p>
        </div>
    ` : '';

    // HTML for options
    const optionsHtml = question.options.map((option, optIndex) => {
        const isSelected = userAnswer === optIndex;
        const isAnswer = optIndex === question.correct_option_index;
        
        let optionClass = 'option-label';
        
        if (isSubmitted) {
            if (isAnswer) {
                // Highlight the correct answer
                optionClass = 'option-label correct border-green-600 bg-green-100 shadow-md';
            } else if (isSelected && !isAnswer) {
                // Highlight the user's incorrect answer
                optionClass = 'option-label incorrect border-red-600 bg-red-100 shadow-md';
            }
        }

        const optionLetter = String.fromCharCode(65 + optIndex); // A, B, C, D
        const cleanOptionText = stripKatexMarkers(option);
        
        return `
            <div class="mb-2">
                <input type="radio" id="q${index}-opt${optIndex}" name="q${index}" value="${optIndex}" 
                       class="hidden peer" data-q-index="${index}" ${isSelected ? 'checked' : ''} ${isSubmitted ? 'disabled' : ''}>
                <label for="q${index}-opt${optIndex}" class="${optionClass} ${isSelected ? 'shadow-lg' : ''}">
                    <span class="font-bold w-6 text-center text-lg mr-3">${optionLetter}.</span>
                    <span class="flex-1">${cleanOptionText}</span>
                    ${isSubmitted && isAnswer ? '<i data-lucide="check-circle" class="text-green-600 ml-4 h-6 w-6"></i>' : ''}
                    ${isSubmitted && isSelected && !isAnswer ? '<i data-lucide="x-circle" class="text-red-600 ml-4 h-6 w-6"></i>' : ''}
                </label>
            </div>
        `;
    }).join('');

    return `
        <div id="question-${index}" class="quiz-question bg-white p-6 rounded-xl shadow-xl transition-all duration-300 ${feedbackClass}">
            <p class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <span class="mr-2 text-blue-600">${questionNumber}.</span>
                <span class="flex-1">${cleanQuestionText}</span>
            </p>
            
            ${scenarioBox}

            <div class="options-container mt-4">
                ${optionsHtml}
            </div>
        </div>
    `;
}

/**
 * Updates the content displayed on the paywall screen (now Sign-In required screen).
 * @param {string} topic - The topic slug requiring sign-in.
 */
export function updatePaywallContent(topic) {
    const elements = getElements();
    if (elements.paywallContent) {
        elements.paywallContent.innerHTML = `
            <div class="p-8 text-center space-y-6 bg-blue-50 rounded-xl shadow-inner max-w-lg mx-auto">
                <i data-lucide="shield-alert" class="w-12 h-12 text-cbse-blue mx-auto"></i>
                <h2 class="text-2xl font-extrabold text-heading">Google Sign-In Required</h2>
                <p class="text-gray-600">
                    To attempt the **${topic.toUpperCase()}** quiz and ensure your scores are recorded for progress tracking and analytics, 
                    please sign in with your Google account.
                </p>
                <button id="auth-sign-in-btn" class="px-8 py-3 bg-accent-gold text-cbse-blue rounded-xl font-bold text-lg hover:bg-yellow-600 transition shadow-xl w-full" 
                        onclick="window.quizEngine.handleSignIn()">
                    Sign In with Google
                </button>
            </div>
        `;
        // Ensure Lucide icons are re-created for the new content
        lucide.createIcons();
    }
}


/**
 * Hides all main view containers and shows only the specified one.
 * @param {('quiz-content'|'results-screen'|'paywall-screen')} viewId - The ID of the view to show.
 */
export function showView(viewId) {
    const elements = getElements();
    if (elements.mainContainer) {
        // Hide all views first
        Object.values(elements.viewContainers).forEach(el => {
            if (el) el.classList.add('hidden');
        });

        // Show the desired view
        const targetView = elements.viewContainers[viewId];
        if (targetView) {
            targetView.classList.remove('hidden');
        } else {
            console.error(`[UI RENDERER ERROR] Attempted to show unknown view: ${viewId}`);
        }
    }
}

/**
 * Shows a status message (e.g., loading or error).
 * @param {string} messageHtml - The HTML content of the message.
 */
export function updateStatus(messageHtml) {
    const elements = getElements();
    if (elements.statusMessage) {
        elements.statusMessage.innerHTML = messageHtml;
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
 * Updates the quiz metadata display (Title, Difficulty).
 */
export function updateQuizMetadata(title, difficulty) {
    const elements = getElements();
    if (elements.quizTitle) {
        elements.quizTitle.textContent = title;
    }
    if (elements.quizDifficulty) {
        // Capitalize difficulty for display
        elements.quizDifficulty.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    }
}

/**
 * Renders the final score on the results screen.
 */
export function renderScore(score, total) {
    const scoreDisplay = document.getElementById('score-display');
    if (scoreDisplay) {
        scoreDisplay.innerHTML = `${score} / ${total}`;
        
        // Optional: Add color based on score percentage
        const percentage = (score / total) * 100;
        scoreDisplay.classList.remove('text-red-600', 'text-yellow-600', 'text-green-600');
        if (percentage >= 80) {
            scoreDisplay.classList.add('text-green-600');
        } else if (percentage >= 50) {
            scoreDisplay.classList.add('text-yellow-600');
        } else {
            scoreDisplay.classList.add('text-red-600');
        }
    }
}
