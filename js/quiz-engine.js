import { fetchQuestions, saveResult } from './api.js';
// FIX: Ensure all named exports from auth-paywall.js are imported correctly.
import { 
    initializeAuthListener, 
    checkPaymentStatus, // This is the function causing the error in some environments. We ensure it's here.
    getCurrentUser, 
    signInWithGoogle, 
    signOut 
} from './auth-paywall.js';
import { 
    showView, 
    updateStatus, 
    hideStatus, 
    renderTitles, 
    renderQuestion, 
    updateResultDisplay,
    initBranding,
    processResultsAndRender,
    getElements,
    updateAuthUI,
    updatePaywallContent
} from './ui-renderer.js';

// --- Application Constants ---\nconst APP_TITLE = "Ready4Exam Quiz";

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
const elements = getElements(); // Get cached DOM elements from ui-renderer

/**
 * Retrieves the user's current answer from the DOM (selected radio button).
 * @returns {string | null} The selected answer string, or null if none is selected.
 */
function getCurrentAnswerFromDOM() {
    // We check the input inside the question container
    const questionContainer = document.getElementById('question-container');
    if (!questionContainer) return null;

    const selectedInput = questionContainer.querySelector('input[type="radio"]:checked');
    if (selectedInput) {
        // Find the corresponding label for the text content
        // Note: The value of the input is often sufficient, but we use the label text for robustness.
        const label = document.querySelector(`label[for="${selectedInput.id}"]`);
        return label ? label.textContent.trim() : null;
    }
    return null;
}

/**
 * Saves the current answer to the state and navigates to the specified question index.
 * @param {number} index - The index of the question to show.
 * @param {boolean} [saveOnly=false] - If true, saves the answer but does not render the next question.
 */
function saveAnswerAndNavigate(index, saveOnly = false) {
    // 1. Save the answer for the current question
    const answer = getCurrentAnswerFromDOM();
    if (answer) {
        currentQuiz.userAnswers[currentQuestionIndex] = answer;
        console.log(`[STATE] Saved answer for Q${currentQuestionIndex}: ${answer}`);
    }

    // 2. If saveOnly is false, navigate and render
    if (!saveOnly) {
        currentQuestionIndex = index;
        renderQuestion(currentQuiz.questions[currentQuestionIndex], currentQuestionIndex, currentQuiz.questions.length, currentQuiz.userAnswers[currentQuestionIndex], isQuizSubmitted);
    }
}

/**
 * Handles navigation to the next question.
 */
function handleNext() {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        saveAnswerAndNavigate(currentQuestionIndex + 1);
    } else if (currentQuestionIndex === currentQuiz.questions.length - 1 && !isQuizSubmitted) {
        // If on the last question and not submitted, treat 'Next' as 'Submit'
        saveAnswerAndNavigate(currentQuestionIndex, true); // Save the last answer
        handleSubmit();
    }
}

/**
 * Handles navigation to the previous question.
 */
function handlePrevious() {
    if (currentQuestionIndex > 0) {
        saveAnswerAndNavigate(currentQuestionIndex - 1);
    }
}

/**
 * Handles the final submission of the quiz.
 */
async function handleSubmit() {
    // 1. Save the answer for the last question (if not already done)
    saveAnswerAndNavigate(currentQuestionIndex, true); 

    if (isQuizSubmitted) {
        // If already submitted, the button acts as 'Review Complete' (or similar)
        showView('results-screen');
        return;
    }
    
    isQuizSubmitted = true;
    showView('loading-status');
    updateStatus('Calculating results and saving score...');

    // 2. Process results and get score
    const score = processResultsAndRender(currentQuiz.questions, currentQuiz.userAnswers);
    const total = currentQuiz.questions.length;

    // 3. Save the result to the database
    const quizResult = {
        userId: getCurrentUser()?.uid || 'anonymous',
        topic: currentQuiz.topic,
        difficulty: currentQuiz.difficulty,
        score: score,
        total: total,
        timestamp: new Date().toISOString()
    };
    
    try {
        await saveResult(quizResult);
        updateStatus('Results saved successfully!');
    } catch (error) {
        console.error("Failed to save quiz result:", error);
        updateStatus('Results calculated, but failed to save score.');
    }

    // 4. Update the results screen display
    updateResultDisplay(score, total);

    // 5. Switch to the results screen
    showView('results-screen');
    hideStatus();
}

/**
 * Callback function run every time the Firebase Auth state changes.
 * @param {Object|null} user - The authenticated user object or null.
 */
function onAuthChange(user) {
    console.log("[AUTH] State changed. User:", user ? user.uid : 'Logged Out');
    
    // 1. Update the header UI
    updateAuthUI(user); 

    // 2. Check payment status again if the quiz content is the current view
    if (user && !isQuizSubmitted) {
        checkAccessAndLoad();
    }
}

/**
 * Load quiz data from the API and render the first question.
 */
async function loadQuiz() {
    try {
        updateStatus('Fetching and preparing questions...');
        currentQuiz.questions = await fetchQuestions(currentQuiz.topic, currentQuiz.difficulty);
        
        // Reset state for new quiz
        currentQuestionIndex = 0;
        isQuizSubmitted = false;
        currentQuiz.userAnswers = {};

        // Render the first question and switch view
        renderQuestion(currentQuiz.questions[0], 0, currentQuiz.questions.length);
        showView('quiz-content');
        hideStatus();

    } catch (error) {
        console.error("[LOAD ERROR] Failed to load quiz:", error);
        updateStatus(`Error loading quiz: ${error.message}. Please try selecting another chapter.`);
        showView('loading-status');
    }
}

/**
 * Checks payment status and proceeds to load quiz if access is granted.
 * Used after auth changes or initial load.
 */
async function checkAccessAndLoad() {
    updateStatus('Checking access...');
    
    // Note: checkPaymentStatus is simplified to just check for authentication status
    const hasAccess = await checkPaymentStatus();

    if (hasAccess) {
        // Access granted: load the quiz
        await loadQuiz();
    } else {
        // Access denied: show paywall
        updatePaywallContent(currentQuiz.topic);
        showView('paywall-screen');
        updateStatus(`Access Denied: Please log in or subscribe to view the '${currentQuiz.topic}' quiz.`);
    }
}


// --- APPLICATION ENTRY POINT ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Parse URL parameters to set context
    const params = new URLSearchParams(window.location.search);
    currentQuiz.class = params.get('class');
    currentQuiz.subject = params.get('subject');
    currentQuiz.topic = params.get('topic');
    currentQuiz.difficulty = params.get('difficulty') || 'medium'; 

    // 2. Display Branding and Tagline immediately
    initBranding(currentQuiz.topic, currentQuiz.difficulty); 
    
    // 3. Initialize Auth listener
    // The onAuthChange callback will handle the subsequent checkAccessAndLoad
    initializeAuthListener(onAuthChange); 
    
    // We only need to set up event listeners once.
    document.getElementById('prev-btn')?.addEventListener('click', handlePrevious);
    document.getElementById('next-btn')?.addEventListener('click', handleNext);
    document.getElementById('submit-button')?.addEventListener('click', handleSubmit);
    document.getElementById('review-quiz-btn')?.addEventListener('click', handleSubmit);
});
