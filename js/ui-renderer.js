// js/ui-renderer.js
// Handles all view rendering and switching logic.

// --- DOM Elements Cache ---
const elements = {
    // Views
    loadingStatus: document.getElementById('loading-status'), // Renamed for clarity
    statusText: document.getElementById('status-text'),
    paywallScreen: document.getElementById('paywall-screen'),
    startScreen: document.getElementById('start-screen'),
    quizContent: document.getElementById('quiz-content'),
    resultsScreen: document.getElementById('results-screen'),
    
    // Header/Branding
    quizPageTitle: document.getElementById('quiz-page-title'),
    difficultyDisplay: document.getElementById('difficulty-display'),
    logoutNavBtn: document.getElementById('logout-nav-btn'),

    // Quiz Elements
    // NOTE: This element ID is now correctly matched with quiz-engine.html
    questionList: document.getElementById('question-list'),
    submitButton: document.getElementById('submit-button'),
    
    // Paywall Elements
    accessRequiredItem: document.getElementById('access-required-item'),
    loginButton: document.getElementById('login-button'),
    payButton: document.getElementById('pay-button'),
    
    // Results
    scoreDisplay: document.getElementById('score-display'),
};

/**
 * Hides all main view containers and shows the specified one.
 * @param {string} viewId - The ID of the view to show ('loading-status', 'start-screen', 'quiz-content', 'results-screen', 'paywall-screen').
 */
export function showView(viewId) {
    Object.values(elements).forEach(el => {
        if (el && el.id && (el.id === 'loading-status' || el.id === 'paywall-screen' || el.id === 'start-screen' || el.id === 'quiz-content' || el.id === 'results-screen')) {
            el.classList.add('hidden');
        }
    });

    const targetEl = elements[viewId];
    if (targetEl) {
        targetEl.classList.remove('hidden');
    }
}

/**
 * Updates the loading/status message.
 * @param {string} text - The message to display.
 */
export function updateStatus(text) {
    if (elements.statusText) {
        elements.statusText.innerHTML = text; // Use innerHTML to allow for bolding
    }
    // Ensure the loading screen is visible when showing status
    showView('loading-status');
}

/**
 * Clears the loading/status message.
 */
export function hideStatus() {
    if (elements.statusText) {
        elements.statusText.textContent = '';
    }
}

/**
 * Sets the main quiz titles in the header.
 * @param {string} topic - The current topic name.
 * @param {string} difficulty - The current difficulty level.
 * @param {number} [totalQuestions=0] - The total number of questions.
 */
export function renderTitles(topic, difficulty, totalQuestions = 0) {
    const topicName = topic || 'Undefined';
    const difficultyLevel = difficulty || 'medium'; // Default to medium if not provided

    if (elements.quizPageTitle) {
        elements.quizPageTitle.textContent = topicName.charAt(0).toUpperCase() + topicName.slice(1) + ' Quiz';
    }
    
    // FIX: Add robust check to prevent TypeError when difficulty is undefined
    const displayDifficulty = difficultyLevel.charAt(0).toUpperCase() + difficultyLevel.slice(1);

    if (elements.difficultyDisplay) {
        elements.difficultyDisplay.textContent = `Difficulty: ${displayDifficulty} | ${totalQuestions} Questions`;
    }
}

/**
 * Initializes basic branding elements (called on DOM load).
 */
export function initBranding() {
    // Placeholder for any non-quiz specific header logic if needed
    // The main titles are set by renderTitles after data loads
}

/**
 * Renders a single question into the question container.
 * @param {Object} question - The question object from the Supabase result.
 * @param {number} index - The index of the question in the quiz array (0-based).
 * @param {string|null} userAnswer - The previously saved answer from the state.
 * @param {boolean} isSubmitted - If the quiz has been submitted (shows correct/incorrect feedback).
 */
export function renderQuestion(question, index, userAnswer, isSubmitted) {
    // CRITICAL FIX: If questionList is null (element not found in HTML), exit
    if (!elements.questionList) {
        console.error("[UI RENDERER] Fatal Error: questionList element not found in HTML.");
        return; 
    }

    // CRITICAL FIX: Check if question object is valid and has options (prevents the .map crash)
    if (!question || !Array.isArray(question.options)) {
        console.error("[UI RENDERER] Invalid question object received or missing options:", question);
        // Display a fallback message if the question object is invalid
        elements.questionList.innerHTML = `<div class="p-6 text-center text-red-600 bg-red-50 rounded-lg">
            <h3 class="text-xl font-semibold">Question Not Available</h3>
            <p>Could not load question data. Please ensure the question object contains a valid 'options' array.</p>
        </div>`;
        return;
    }

    // Clear previous question content
    elements.questionList.innerHTML = '';
    
    // Create the container for the new question content
    const questionContent = document.createElement('div');
    questionContent.id = 'question-content-display'; // Use a new ID for the dynamic content
    questionContent.className = 'space-y-6';

    // 1. Render Question Text
    questionContent.innerHTML += `
        <h3 class="text-xl font-bold text-gray-800">Q${index + 1}. (${question.question_type.toUpperCase().replace('_', ' ')})</h3>
        <p class="text-lg text-gray-700">${question.question_text}</p>
    `;

    // 2. Render Options
    const optionsHtml = question.options.map((optionText, optionIndex) => {
        // Use the option text itself as the value for simplicity
        const optionValue = optionText; 
        const isChecked = userAnswer === optionValue;
        const inputId = `q${index}-option-${optionIndex}`;

        // Added custom-radio span for better styling control
        return `
            <div class="flex items-start">
                <input type="radio" 
                       id="${inputId}" 
                       name="question-${index}" 
                       value="${optionValue}" 
                       class="sr-only"
                       ${isChecked ? 'checked' : ''}
                       ${isSubmitted ? 'disabled' : ''}>
                <label for="${inputId}" class="option-label">
                    <span class="custom-radio"></span>
                    <span class="text-gray-700 font-medium">${optionText}</span>
                </label>
            </div>
        `;
    }).join('');

    questionContent.innerHTML += `<div class="space-y-3">${optionsHtml}</div>`;
    elements.questionList.appendChild(questionContent);
    
    // 3. Apply Submission Feedback if already submitted
    if (isSubmitted) {
        // Find all option labels and inputs
        questionContent.querySelectorAll('input[type="radio"]').forEach(radioInput => {
            const label = questionContent.querySelector(`label[for="${radioInput.id}"]`);
            const customRadio = label.querySelector('.custom-radio');
            const optionValue = radioInput.value;
            const correctAnswer = question.correct_answer; // From the question object

            // Check if this is the correct answer
            if (optionValue === correctAnswer) {
                label.classList.add('correct');
                if (customRadio) customRadio.classList.add('correct');
            }

            // Highlight the user's incorrect choice if they made one
            if (radioInput.checked && optionValue !== correctAnswer) {
                label.classList.add('incorrect');
                if (customRadio) customRadio.classList.add('incorrect');
            }
            
            // Disable all options after submission (redundant check, but safe)
            radioInput.disabled = true;
        });
    }
}


/**
 * Updates the score display on the results screen.
 * @param {number} score 
 * @param {number} total 
 */
export function updateResultDisplay(score, total) {
    elements.scoreDisplay.textContent = `${score} / ${total}`;
}

/**
 * Updates the header UI based on user authentication status.
 * @param {Object|null} user 
 */
export function updateAuthUI(user) {
    if (user) {
        elements.logoutNavBtn.classList.remove('hidden');
        elements.logoutNavBtn.textContent = `🚪 Logout (${user.displayName || user.email || 'User'})`;
    } else {
        elements.logoutNavBtn.classList.add('hidden');
        elements.logoutNavBtn.textContent = `🚪 Logout`; // Reset if user logs out
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
