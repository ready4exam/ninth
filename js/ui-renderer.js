// js/ui-renderer.js
// Handles all view rendering and switching logic.

// --- DOM Elements Cache ---
const elements = {
    // Views
    statusMessage: document.getElementById('status-message'),
    statusText: document.getElementById('status-text'),
    paywallScreen: document.getElementById('paywall-screen'),
    startScreen: document.getElementById('start-screen'),
    quizContent: document.getElementById('quiz-content'),
    resultsScreen: document.getElementById('results-screen'),
    
    // Header/Branding
    quizPageTitle: document.getElementById('quiz-page-title'),
    quizTitle: document.getElementById('quiz-title'),
    quizSubtitle: document.getElementById('quiz-subtitle'),
    difficultyDisplay: document.getElementById('difficulty-display'),
    logoutNavBtn: document.getElementById('logout-nav-btn'),

    // Difficulty/Start Screen
    simpleCount: document.getElementById('simple-available-q'),
    mediumCount: document.getElementById('medium-available-q'),
    advancedCount: document.getElementById('advanced-available-q'),

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

// --- VIEW MANAGEMENT ---

/**
 * Hides all main application views.
 */
function hideAllViews() {
    elements.paywallScreen.classList.add('hidden');
    elements.startScreen.classList.add('hidden');
    elements.quizContent.classList.add('hidden');
    elements.resultsScreen.classList.add('hidden');
}

/**
 * Displays a specific view.
 * @param {string} viewName - 'paywall', 'start', 'quiz', 'results'
 */
export function showView(viewName) {
    hideAllViews();
    switch (viewName) {
        case 'paywall':
            elements.paywallScreen.classList.remove('hidden');
            break;
        case 'start':
            elements.startScreen.classList.remove('hidden');
            break;
        case 'quiz':
            elements.quizContent.classList.remove('hidden');
            break;
        case 'results':
            elements.resultsScreen.classList.remove('hidden');
            break;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- STATUS MESSAGE ---

/**
 * Updates and optionally shows the global status message.
 * @param {string} text 
 * @param {boolean} showLoader 
 */
export function updateStatus(text, showLoader = false) {
    elements.statusText.textContent = text;
    elements.statusMessage.classList.remove('hidden');
    
    const loaderIcon = elements.statusMessage.querySelector('i[data-lucide="loader-circle"]');
    if (loaderIcon) {
        if (showLoader) {
            loaderIcon.classList.remove('hidden');
        } else {
            loaderIcon.classList.add('hidden');
        }
    }
}

/**
 * Hides the global status message.
 */
export function hideStatus() {
    elements.statusMessage.classList.add('hidden');
}


// --- RENDERING FUNCTIONS ---

/**
 * Renders the page titles based on URL parameters.
 * @param {string} className 
 * @param {string} subject 
 * @param {string} topic 
 */
export function renderTitles(className, subject, topic) {
    const formattedTopic = topic.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const formattedSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
    
    elements.quizPageTitle.textContent = `Ready4Exam | Class ${className} ${formattedTopic}`;
    elements.quizTitle.textContent = `${formattedTopic} Quiz`;
    elements.quizSubtitle.textContent = `CBSE Class ${className} | ${formattedSubject} Chapter`;
    elements.accessRequiredItem.textContent = `${formattedTopic} Chapter Quiz`; // For paywall
}

/**
 * Displays question counts on the Start Screen.
 * @param {Object} counts - { Simple: 10, Medium: 15, Advanced: 5 }
 */
export function renderQuestionCounts(counts) {
    elements.simpleCount.textContent = `${counts.Simple}`;
    elements.mediumCount.textContent = `${counts.Medium}`;
    elements.advancedCount.textContent = `${counts.Advanced}`;
}

/**
 * Renders the full list of questions for the quiz.
 * @param {Array<Object>} questions - Array of question objects.
 */
export function renderQuestions(questions) {
    elements.questionList.innerHTML = ''; // Clear previous questions
    
    const html = questions.map((q, qIndex) => {
        // Combine all options (assuming they are named option1, option2, etc.)
        const options = [q.option1, q.option2, q.option3, q.option4].filter(o => o);

        const optionsHtml = options.map((optionText, optIndex) => `
            <div class="mb-2">
                <input type="radio" id="q${qIndex}opt${optIndex}" name="question${qIndex}" value="${optionText}" class="hidden peer">
                <label for="q${qIndex}opt${optIndex}" class="option-label block w-full p-4 rounded-xl bg-white text-gray-800 font-medium peer-checked:border-cbse-blue peer-checked:bg-cbse-light">
                    ${optionText}
                </label>
            </div>
        `).join('');

        return `
            <div id="q${qIndex}" class="question-item p-6 bg-white rounded-xl shadow-lg border-l-4 border-cbse-blue">
                <p class="text-sm font-semibold text-cbse-blue mb-2">Question ${qIndex + 1} / Difficulty: ${q.difficulty}</p>
                <h3 class="text-xl font-bold text-cbse-dark mb-4">${q.question_text}</h3>
                <div class="options-container space-y-2">
                    ${optionsHtml}
                </div>
                <div id="q${qIndex}feedback" class="feedback-box mt-3 text-sm font-semibold hidden p-3 rounded-lg"></div>
            </div>
        `;
    }).join('');

    elements.questionList.innerHTML = html;
}

/**
 * Applies immediate feedback to the quiz interface after submission.
 * @param {Array<Object>} questions - The original question data.
 * @param {Array<string>} userAnswers - Array of user-selected answers.
 * @returns {number} - The final score.
 */
export function showFeedback(questions, userAnswers) {
    let score = 0;

    questions.forEach((q, qIndex) => {
        const userAnswer = userAnswers[qIndex];
        const correctAnswer = q.correct_option;
        const questionItem = document.getElementById(`q${qIndex}`);
        const feedbackBox = document.getElementById(`q${qIndex}feedback`);

        if (!questionItem || !feedbackBox) return;

        feedbackBox.classList.remove('hidden');
        
        // Find all option labels for this question
        const optionLabels = questionItem.querySelectorAll('.option-label');

        if (userAnswer === correctAnswer) {
            score++;
            questionItem.classList.add('border-accent-chemistry'); // Green border
            feedbackBox.classList.add('correct');
            feedbackBox.textContent = '✅ Correct! Well done.';
        } else {
            questionItem.classList.add('border-accent-biology'); // Red border
            feedbackBox.classList.add('incorrect');
            
            let feedbackText = '❌ Incorrect.';
            if (userAnswer) {
                feedbackText += ` You chose: "${userAnswer}".`;
            } else {
                feedbackText += ` You did not attempt this question.`;
            }
            feedbackText += ` The correct answer was: "${correctAnswer}".`;
            feedbackBox.textContent = feedbackText;
        }
        
        // Highlight the correct answer
        optionLabels.forEach(label => {
            if (label.textContent.trim() === correctAnswer) {
                label.classList.add('correct');
                label.classList.remove('peer-checked:border-cbse-blue'); // Remove checked styling
            }
            // Highlight the user's incorrect choice if they made one
            if (userAnswer && label.textContent.trim() === userAnswer && userAnswer !== correctAnswer) {
                label.classList.add('incorrect');
            }
            // Disable all options after submission
            label.parentElement.querySelector('input').disabled = true;
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
        elements.logoutNavBtn.textContent = `🚪 Logout (${user.displayName || user.email})`;
    } else {
        elements.logoutNavBtn.classList.add('hidden');
    }
}

