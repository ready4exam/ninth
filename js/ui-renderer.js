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

    // Difficulty/Start Screen (Simplified)
    // simpleCount: document.getElementById('simple-available-q'),
    // mediumCount: document.getElementById('medium-available-q'),
    // advancedCount: document.getElementById('advanced-available-q'),
    // startQuizBtn: document.getElementById('start-quiz-btn'),

    // Quiz Elements
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
 * Hides all main views and shows only the one specified by ID.
 * @param {string} id - The ID of the view element to show ('paywall-screen', 'quiz-content', 'results-screen', 'start-screen').
 */
export function showView(id) {
    const views = [elements.paywallScreen, elements.startScreen, elements.quizContent, elements.resultsScreen];
    views.forEach(view => {
        if (view) view.classList.add('hidden');
    });

    const targetView = document.getElementById(id);
    if (targetView) {
        targetView.classList.remove('hidden');
    }
    // Always hide loading status when switching to a main view
    elements.loadingStatus?.classList.add('hidden');
}

/**
 * Displays a loading/status message.
 * @param {string} msg 
 */
export function updateStatus(msg) { 
    if (elements.loadingStatus) {
        elements.loadingStatus.classList.remove('hidden');
        elements.statusText.textContent = msg;
    }
}

/**
 * Updates the header UI with quiz context.
 * @param {string} title 
 * @param {string} topic 
 * @param {string} difficulty 
 */
export function updateHeader(title, topic, difficulty) { 
    if (elements.quizPageTitle) {
        elements.quizPageTitle.textContent = title; 
    }
    if (elements.difficultyDisplay) {
        // Capitalize difficulty
        const diff = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
        elements.difficultyDisplay.innerHTML = `Topic: <span class="font-semibold">${topic}</span> | Difficulty: <span class="font-semibold text-accent-gold">${diff}</span>`;
    }
}

/**
 * Creates the HTML structure for a single question.
 * @param {Object} question - The question object from the API.
 * @param {number} index - The 0-based index of the question.
 * @returns {string} The HTML string for the question card.
 */
function createQuestionCard(question, index) {
    // Determine the icon and type label
    let iconName, typeLabel, color;
    switch (question.type) {
        case 'assertion_reasoning':
            iconName = 'message-circle-question';
            typeLabel = 'Assertion-Reasoning';
            color = 'text-orange-500';
            break;
        case 'case_study':
            iconName = 'book-open';
            typeLabel = 'Case Study';
            color = 'text-purple-500';
            break;
        case 'mcq':
        default:
            iconName = 'circle-check';
            typeLabel = 'Multiple Choice';
            color = 'text-blue-500';
    }

    // Render Case Study scenario if it exists
    const scenarioHtml = question.scenario 
        ? `<div class="p-4 mb-4 bg-gray-100 border-l-4 border-purple-400 rounded-md">
            <p class="font-semibold text-purple-700 mb-2 flex items-center"><i data-lucide="notebook-text" class="h-4 w-4 mr-2"></i>Case Scenario:</p>
            <p class="text-sm text-gray-700">${question.scenario}</p>
        </div>`
        : '';


    // Render Options
    const optionsHtml = question.options.map((option, optionIndex) => {
        const optionId = `q${index}-opt${optionIndex}`;
        return `
            <div class="relative mb-3">
                <input type="radio" id="${optionId}" name="question-${index}" value="${option}" class="option-input hidden peer" data-question-index="${index}">
                <label for="${optionId}" class="option-label peer-checked:border-blue-500 peer-checked:bg-blue-50">
                    <span class="font-bold text-gray-700 mr-3">${String.fromCharCode(65 + optionIndex)}.</span>
                    <span class="flex-1 question-text">${option}</span>
                </label>
            </div>
        `;
    }).join('');

    return `
        <div id="question-${index}-card" class="card mb-10 border-t-8 border-t-blue-600">
            <!-- Question Header -->
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-gray-200">
                <h3 class="text-xl font-bold text-gray-800">Question ${index + 1}</h3>
                <span class="flex items-center text-sm font-medium ${color}">
                    <i data-lucide="${iconName}" class="h-4 w-4 mr-1"></i> ${typeLabel}
                </span>
            </div>
            
            ${scenarioHtml}

            <!-- Question Text -->
            <p class="text-lg font-medium text-heading mb-6 question-text" data-question-index="${index}">
                ${question.question}
            </p>

            <!-- Options -->
            <form id="form-q-${index}" class="options-container">
                ${optionsHtml}
            </form>

            <!-- Feedback Box (Initially hidden) -->
            <div id="feedback-q-${index}" class="hidden mt-4 p-4 rounded-lg text-sm font-medium border border-gray-300 bg-gray-50">
                <!-- Feedback will be inserted here after submission -->
            </div>
        </div>
    `;
}

/**
 * Renders the full list of questions to the quiz content area.
 * @param {Array<Object>} questions - The array of question objects.
 * @param {Function} onOptionSelect - Callback for when an option is selected.
 */
export function renderQuestionList(questions, onOptionSelect) {
    if (!elements.questionList) return;

    // Generate HTML for all questions
    const questionsHtml = questions.map(createQuestionCard).join('');
    elements.questionList.innerHTML = questionsHtml;

    // After rendering, update icons and process math
    lucide.createIcons();
    if (window.MathJax) {
        window.MathJax.typesetPromise();
    }
    
    // Attach event listeners for options
    elements.questionList.querySelectorAll('input[type="radio"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const questionIndex = parseInt(e.target.dataset.questionIndex, 10);
            const selectedAnswer = e.target.value;
            onOptionSelect(questionIndex, selectedAnswer);
        });
    });
}


/**
 * Processes the quiz results on the UI, showing correct/incorrect answers and feedback.
 * @param {Array<Object>} questions - The full array of question objects.
 * @param {Array<string|null>} userAnswers - The user's answers.
 * @returns {number} The final calculated score.
 */
export function showResults(questions, userAnswers) {
    let score = 0;

    questions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = question.options[question.correctAnswerIndex];
        const questionCard = document.getElementById(`question-${index}-card`);
        const feedbackBox = document.getElementById(`feedback-q-${index}`);
        const optionLabels = questionCard.querySelectorAll('.option-label');
        
        feedbackBox.classList.remove('hidden');

        if (userAnswer === correctAnswer) {
            score++;
            feedbackBox.classList.add('bg-green-50', 'text-green-800', '!border-green-600');
            feedbackBox.textContent = "✅ Correct! Well done.";
        } else {
            feedbackBox.classList.add('bg-red-50', 'text-red-800', '!border-red-600');
            let feedbackText = "❌ Incorrect.";
            
            // Add reasoning if available
            if (question.reasoning) {
                 feedbackText += ` Reasoning: ${question.reasoning}`;
            } else if (userAnswer === null) {
                feedbackText = `🚫 Unattempted.`;
            } else {
                feedbackText += ` You chose: "${userAnswer}".`;
            }
            feedbackText += ` The correct answer was: "${correctAnswer}".`;
            feedbackBox.textContent = feedbackText;
        }
        
        // Highlight the correct answer and user choice
        optionLabels.forEach(label => {
            const radioInput = label.parentElement.querySelector('input');
            const optionValue = radioInput.value;

            // Remove peer-checked styling
            label.classList.remove('peer-checked:border-blue-500', 'peer-checked:bg-blue-50'); 

            if (optionValue === correctAnswer) {
                label.classList.add('correct');
            }
            // Highlight the user's incorrect choice if they made one
            if (userAnswer && optionValue === userAnswer && userAnswer !== correctAnswer) {
                label.classList.add('incorrect');
            }
            // Disable all options after submission
            radioInput.disabled = true;
        });
    });

    return score;
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
