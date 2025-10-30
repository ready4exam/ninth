import { fetchQuestions, saveResult } from './api.js';
import { initializeAuthListener, checkPaymentStatus, getCurrentUser } from './auth-paywall.js';
import { 
    showView, 
    updateStatus, 
    hideStatus, 
    // Added renderTitles, initBranding, processResultsAndRender, and updateNavigation 
    // to resolve the earlier module import errors.
    renderTitles, 
    renderQuestion, 
    updateResultDisplay,
    initBranding,
    processResultsAndRender,
    updateNavigation, // Ensure this is imported for use in navigation functions
    updateAuthUI,     // Ensure this is imported for onAuthChange
    updatePaywallContent // Ensure this is imported for access denial
} from './ui-renderer.js';

// --- Application Constants ---
const APP_TITLE = "Ready4Exam Quiz";

// --- Quiz State Management ---
const currentQuiz = {
    class: null,
    subject: null,
    topic: null,
    difficulty: null,
    questions: [],
    userAnswers: {}, // Key: question index, Value: user's selected option (string)
};
let currentQuestionIndex = 0;
let isQuizSubmitted = false;


/**
 * Retrieves the user's current answer from the DOM (selected radio button).
 * @returns {string | null} The selected answer string, or null if none is selected.
 */
function getCurrentAnswerFromDOM() {
    const questionContainer = document.getElementById('question-container');
    const selectedInput = questionContainer.querySelector('input[type="radio"]:checked');
    if (selectedInput) {
        // Find the corresponding label for the text content
        const label = document.querySelector(`label[for="${selectedInput.id}"]`);
        return label ? label.textContent.trim() : null;
    }
    return null;
}

/**
 * Updates the visibility of the Prev, Next, and Submit buttons.
 */
function updateNavigationButtons() {
    updateNavigation(currentQuestionIndex, currentQuiz.questions.length, isQuizSubmitted);
}

/**
 * Saves the current answer to the state and navigates to the specified question index.
 * @param {number} index - The index of the question to show.
 */
function navigateToQuestion(index) {
    if (currentQuiz.questions.length === 0) return;

    // 1. Save the answer for the current question before leaving it
    const currentAnswer = getCurrentAnswerFromDOM();
    if (currentAnswer !== null) {
        currentQuiz.userAnswers[currentQuestionIndex] = currentAnswer;
        console.log(`[STATE] Saved answer for Q${currentQuestionIndex}: ${currentAnswer}`);
    }

    // 2. Validate new index
    if (index < 0) {
        currentQuestionIndex = 0; // Prevent going below 0
    } else if (index >= currentQuiz.questions.length) {
        currentQuestionIndex = currentQuiz.questions.length - 1; // Prevent going past the last question
    } else {
        currentQuestionIndex = index;
    }

    // 3. Render the new question
    const question = currentQuiz.questions[currentQuestionIndex];
    const userAnswer = currentQuiz.userAnswers[currentQuestionIndex] || null;

    renderQuestion(question, currentQuestionIndex, currentQuiz.questions.length, userAnswer, isQuizSubmitted);

    // 4. Update navigation buttons visibility
    updateNavigationButtons();
}

/**
 * Handles navigation to the previous question.
 */
function handlePrevious() {
    navigateToQuestion(currentQuestionIndex - 1);
}

/**
 * Handles navigation to the next question.
 */
function handleNext() {
    // If we are on the last question, we treat 'Next' as saving the answer before submission
    if (currentQuestionIndex === currentQuiz.questions.length - 1 && !isQuizSubmitted) {
        const currentAnswer = getCurrentAnswerFromDOM();
        if (currentAnswer !== null) {
            currentQuiz.userAnswers[currentQuestionIndex] = currentAnswer;
        }
        handleSubmit();
    } else {
        navigateToQuestion(currentQuestionIndex + 1);
    }
}


/**
 * Processes the quiz submission, calculates score, and displays results.
 */
async function handleSubmit() {
    // 1. Mark the quiz as submitted
    isQuizSubmitted = true;
    
    // Ensure the last answer is saved before processing
    const currentAnswer = getCurrentAnswerFromDOM();
    if (currentAnswer !== null) {
        currentQuiz.userAnswers[currentQuestionIndex] = currentAnswer;
    }

    // 2. Process results, calculate score
    const total = currentQuiz.questions.length;
    const score = processResultsAndRender(currentQuiz.questions, currentQuiz.userAnswers);

    // 3. Update the results display
    updateResultDisplay(score, total);
    
    // 4. Save the result to the database (if logged in)
    const user = getCurrentUser();
    if (user) {
        const quizResult = {
            userId: user.uid,
            class: currentQuiz.class,
            subject: currentQuiz.subject,
            topic: currentQuiz.topic,
            difficulty: currentQuiz.difficulty,
            score: score,
            totalQuestions: total,
            answers: currentQuiz.userAnswers, 
            timestamp: new Date().toISOString()
        };
        try {
            await saveResult(quizResult);
            console.log("[QUIZ] Result saved successfully.");
        } catch (error) {
            console.error("[QUIZ ERROR] Failed to save result:", error);
        }
    } else {
         console.log("[QUIZ] User not authenticated. Result not saved.");
    }

    // 5. Switch to the results screen and re-render the current question for review
    updateNavigationButtons(); 
    navigateToQuestion(currentQuestionIndex); // Rerender current question for instant review
    showView('results-screen');
}


/**
 * Loads the quiz questions and sets up the initial view.
 */
async function loadQuiz() {
    updateStatus(`Loading quiz for **${currentQuiz.topic}**...`);
    
    try {
        // 1. Fetch questions from the API
        currentQuiz.questions = await fetchQuestions(
            currentQuiz.topic,
            currentQuiz.difficulty
        );

        // 2. Set initial state
        currentQuestionIndex = 0;
        isQuizSubmitted = false;
        currentQuiz.userAnswers = {};

        // 3. Transition to the quiz view and render the first question
        hideStatus();
        showView('quiz-content');
        navigateToQuestion(currentQuestionIndex);

        console.log(`[QUIZ] Quiz started with ${currentQuiz.questions.length} questions.`);

    } catch (error) {
        console.error("[QUIZ ERROR] Failed to load quiz:", error);
        updateStatus(`Failed to load quiz: ${error.message}. Please check console for details.`);
        // Show loading status with error message
        showView('loading-status');
    }
}


/**
 * Callback function run every time the Firebase Auth state changes.
 * @param {Object|null} user - The authenticated user object or null.
 */
function onAuthChange(user) {
    console.log("[AUTH] State changed. User:", user ? 'Authenticated' : 'Logged Out');

    // Update UI for the header (logout button)
    updateAuthUI(user);

    // If a user logs in (user is not null) AND we are currently showing the paywall, 
    // re-check access and load the quiz.
    if (user && document.getElementById('paywall-screen').classList.contains('hidden') === false) {
        checkAccessAndLoad();
    }
}

/**
 * Checks payment status and proceeds to load quiz if access is granted.
 * Used after auth changes or initial load.
 */
async function checkAccessAndLoad() {
    showView('loading-status');
    updateStatus('Checking access and subscription status...');

    const hasAccess = await checkPaymentStatus();
    hideStatus();

    if (hasAccess) {
        // Access granted: load the quiz
        await loadQuiz();
    } else {
        // Access denied: show paywall
        updatePaywallContent(currentQuiz.topic);
        showView('paywall-screen');
        console.log(`[ACCESS] Access Denied. Showing paywall for ${currentQuiz.topic}.`);
    }
}


// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Parse URL parameters to set context
    const params = new URLSearchParams(window.location.search);
    currentQuiz.class = params.get('class');
    currentQuiz.subject = params.get('subject');
    currentQuiz.topic = params.get('topic');
    currentQuiz.difficulty = params.get('difficulty') || 'medium'; 

    // 2. Display Branding and Tagline immediately
    // Note: initBranding now takes the individual properties needed to render the titles.
    initBranding(currentQuiz.topic, currentQuiz.difficulty, currentQuiz.subject); 
    
    // 3. Initialize Auth listener
    initializeAuthListener(onAuthChange); 
    
    // 4. Initial access check (This will run once after the auth listener setup)
    checkAccessAndLoad();
    
    // --- Event Listeners ---
    document.getElementById('prev-btn')?.addEventListener('click', handlePrevious);
    document.getElementById('next-btn')?.addEventListener('click', handleNext);
    document.getElementById('submit-button')?.addEventListener('click', handleSubmit);
    document.getElementById('review-complete-btn')?.addEventListener('click', () => {
        // Redirect back to the chapter selection page
        window.location.href = `chapter-selection.html?class=${currentQuiz.class}&subject=${currentQuiz.subject}`;
    });
});
