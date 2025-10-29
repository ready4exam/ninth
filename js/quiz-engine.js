import { fetchQuestions, saveResult } from './api.js';
import { initializeAuthListener, checkPaymentStatus, getCurrentUser } from './auth-paywall.js';
import { 
    showView, 
    updateStatus, 
    renderTitles, 
    renderQuestion, 
    updateResultDisplay,
    updateNavigation,
    updateAuthUI,
    updatePaywallContent,
    getElements,
} from './ui-renderer.js';

// --- Application Constants ---\
const QUIZ_TOTAL_QUESTIONS = 20; // Expected total from API: 10 MCQ + 5 AR + 5 Case

// --- Quiz State Management ---
const currentQuiz = {
    class: null,
    subject: null,
    topic: null,
    difficulty: null,
    questions: [],
    userAnswers: {}, // Key: question index, Value: user's selected option (string)
    score: 0,
};
let currentQuestionIndex = 0;
let isQuizSubmitted = false;

// --- Utility Functions ---

/**
 * Retrieves the user's current answer from the DOM (selected radio button).
 * @returns {string | null} The selected answer string, or null if none is selected.
 */
function getCurrentAnswerFromDOM() {
    const questionContainer = getElements().questionContainer;
    if (!questionContainer) return null;

    // Use querySelector to find the checked radio button within the question container
    const selectedInput = questionContainer.querySelector('input[type="radio"]:checked');
    
    // The value of the radio button IS the option text (set in renderQuestion)
    return selectedInput ? selectedInput.value : null;
}

/**
 * Saves the current answer to the state and navigates to the specified question index.
 * @param {number} index - The index of the question to show.
 */
function saveAnswerAndShow(index) {
    // 1. Save the answer for the current question before moving
    // Only save if the quiz is not already submitted (to prevent accidental overwrites during review)
    if (!isQuizSubmitted) {
        currentQuiz.userAnswers[currentQuestionIndex] = getCurrentAnswerFromDOM();
    }
    
    // 2. Update the question index
    currentQuestionIndex = index;

    // 3. Render the new question
    showQuestion();
}

/**
 * Core function to render the question at the currentQuestionIndex.
 */
function showQuestion() {
    if (currentQuiz.questions.length === 0) return;
    
    const question = currentQuiz.questions[currentQuestionIndex];
    const userAnswer = currentQuiz.userAnswers[currentQuestionIndex];

    renderQuestion(
        question, 
        currentQuestionIndex, 
        currentQuiz.questions.length, 
        userAnswer, 
        isQuizSubmitted
    );
    
    // Update the navigation controls (counter, next/prev button visibility)
    updateNavigation(currentQuestionIndex, currentQuiz.questions.length, isQuizSubmitted);

    // Re-attach listener for option selection to enable instant answer saving (if not submitted)
    if (!isQuizSubmitted) {
        document.querySelectorAll('input[type="radio"]').forEach(input => {
            input.addEventListener('change', (e) => {
                currentQuiz.userAnswers[currentQuestionIndex] = e.target.value;
                // Optional: Re-render the current question to apply selection styling immediately
                showQuestion(); 
            });
        });
    }
}

/**
 * Handles navigation to the next question, or submission if on the last question.
 */
function handleNext() {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        saveAnswerAndShow(currentQuestionIndex + 1);
    } 
}

/**
 * Handles navigation to the previous question.
 */
function handlePrevious() {
    if (currentQuestionIndex > 0) {
        saveAnswerAndShow(currentQuestionIndex - 1);
    }
}

/**
 * Calculates the score and submits the result.
 */
async function handleSubmit() {
    if (isQuizSubmitted) return; // Prevent double submission

    // 1. Save the answer for the current (last) question
    currentQuiz.userAnswers[currentQuestionIndex] = getCurrentAnswerFromDOM();
    
    let score = 0;
    
    // 2. Calculate the final score
    currentQuiz.questions.forEach((question, index) => {
        const userAnswer = currentQuiz.userAnswers[index];
        if (userAnswer === question.correct_answer) {
            score++;
        }
    });

    currentQuiz.score = score;
    isQuizSubmitted = true;
    
    // 3. Show results screen
    updateResultDisplay(score, currentQuiz.questions.length);
    showView('results-screen');
    
    // 4. Render the last question with feedback visible for review
    showQuestion(); 

    // 5. Prepare data for saving
    const user = getCurrentUser();
    const resultToSave = {
        user_id: user ? user.uid : 'anonymous',
        topic_slug: currentQuiz.topic,
        difficulty: currentQuiz.difficulty,
        score: score,
        total_questions: currentQuiz.questions.length,
        timestamp: new Date().toISOString(),
    };
    
    // 6. Save result (non-blocking)
    try {
        await saveResult(resultToSave);
        console.log("[QUIZ] Quiz result saved successfully.");
    } catch (e) {
        console.error("[QUIZ ERROR] Failed to save quiz result:", e);
        // User is notified via console, but quiz completes.
    }
}

/**
 * Handles the click on the 'Finish Review' button to go back to the selection screen.
 */
function handleFinishReview() {
    window.location.href = `chapter-selection.html?class=${currentQuiz.class}`;
}

/**
 * Main function to load the quiz data from the API.
 */
async function loadQuiz() {
    if (!currentQuiz.topic) {
        updateStatus("Error: Quiz topic not found in URL. Returning home.");
        setTimeout(() => window.location.href = 'index.html', 3000);
        return;
    }
    
    try {
        updateStatus(`Fetching ${currentQuiz.difficulty} questions for topic: ${currentQuiz.topic}...`);
        
        // Fetch questions from the API
        const questions = await fetchQuestions(currentQuiz.topic, currentQuiz.difficulty);
        
        // Check for expected length
        if (questions.length !== QUIZ_TOTAL_QUESTIONS) {
             console.warn(`[QUIZ WARNING] Expected ${QUIZ_TOTAL_QUESTIONS} questions but received ${questions.length}. Proceeding anyway.`);
        }
        
        // Update state
        currentQuiz.questions = questions;
        currentQuestionIndex = 0; // Always start at the first question
        isQuizSubmitted = false;
        
        // Render the UI
        renderTitles(currentQuiz.topic.replace(/_/g, ' '), currentQuiz.difficulty, currentQuiz.subject);
        showView('quiz-content');
        showQuestion();

    } catch (e) {
        console.error("[QUIZ FATAL] Failed to load quiz:", e);
        updateStatus(`Could not load quiz questions: ${e.message}. Please check console.`);
        // Show paywall/loading screen indefinitely with error message
        showView('loading-status');
    }
}

/**
 * Authentication state change listener. 
 * This is the gatekeeper for loading the quiz content.
 * @param {Object|null} user - The authenticated Firebase user object.
 */
async function onAuthChange(user) {
    // 1. Update header UI immediately
    updateAuthUI(user);
    
    // 2. Format topic for paywall display
    const topicTitle = currentQuiz.topic ? currentQuiz.topic.replace(/_/g, ' ') : 'Required Topic';
    updatePaywallContent(topicTitle);
    
    // 3. Check access
    const hasAccess = await checkPaymentStatus(currentQuiz.topic);
    
    if (hasAccess) {
        // If authenticated, proceed to load the quiz
        showView('loading-status');
        await loadQuiz();
    } else {
        // If not authenticated, show the paywall/login screen
        updateStatus("Authentication required to access this quiz.");
        showView('paywall-screen');
    }
}


// --- Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Parse URL parameters to set context
    const params = new URLSearchParams(window.location.search);
    currentQuiz.class = params.get('class');
    currentQuiz.subject = params.get('subject');
    currentQuiz.topic = params.get('topic');
    currentQuiz.difficulty = params.get('difficulty') || 'medium'; 
    
    // Display branding immediately (even before auth)
    renderTitles(currentQuiz.topic.replace(/_/g, ' '), currentQuiz.difficulty, currentQuiz.subject);
    
    // Initialize Auth listener which will call onAuthChange to start the quiz loading process
    initializeAuthListener(onAuthChange); 

    // --- Event Listeners for Navigation ---
    document.getElementById('prev-btn')?.addEventListener('click', handlePrevious);
    document.getElementById('next-btn')?.addEventListener('click', handleNext);
    document.getElementById('submit-button')?.addEventListener('click', handleSubmit);
    document.getElementById('review-complete-btn')?.addEventListener('click', handleFinishReview);
});
