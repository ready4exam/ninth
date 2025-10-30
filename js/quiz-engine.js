// js/quiz-engine.js
import { fetchQuestions, saveResult } from './api.js';
import { initializeAuthListener, checkPaymentStatus, getCurrentUser, signInWithGoogle, signOut } from './auth-paywall.js';
import { 
    showView, 
    updateStatus, 
    hideStatus, 
    renderQuestion, 
    updateResultDisplay,
    initBranding,
    updateNavigation,
    processResultsAndRender,
    updatePaywallContent
} from './ui-renderer.js';

// --- Application Constants ---\
const DEFAULT_TOPIC = 'motion';
const DEFAULT_DIFFICULTY = 'easy';

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
let isLoading = true;


/**
 * Retrieves the user's current answer from the DOM (selected radio button).
 * @returns {string | null} The selected answer string, or null if none is selected.
 */
function getCurrentAnswerFromDOM() {
    const questionContainer = document.getElementById('question-container');
    if (!questionContainer) return null;

    // Use querySelector to find the checked radio button within the container
    const selectedInput = questionContainer.querySelector('input[type="radio"]:checked');
    if (selectedInput) {
        // The value attribute of the radio button holds the option text
        return selectedInput.value;
    }
    return null;
}

/**
 * Saves the current answer to the state and navigates to the specified question index.
 * @param {number} newIndex - The index of the question to show next.
 */
function navigateToQuestion(newIndex) {
    if (isLoading) return;

    // 1. Save the answer for the current question before leaving
    const currentAnswer = getCurrentAnswerFromDOM();
    if (currentAnswer) {
        currentQuiz.userAnswers[currentQuestionIndex] = currentAnswer;
        console.log(`[STATE] Saved answer for Q${currentQuestionIndex + 1}: ${currentAnswer}`);
    } else {
        // If nothing is selected, we save null/undefined to mark it as unanswered
        delete currentQuiz.userAnswers[currentQuestionIndex];
    }
    
    // 2. Update the index
    currentQuestionIndex = newIndex;

    // 3. Render the new question
    renderQuestion(
        currentQuiz.questions[currentQuestionIndex],
        currentQuestionIndex,
        currentQuiz.questions.length,
        currentQuiz.userAnswers[currentQuestionIndex], // Pass previously saved answer
        isQuizSubmitted
    );

    // 4. Update navigation buttons
    updateNavigation(currentQuestionIndex, currentQuiz.questions.length, isQuizSubmitted);
}

/**
 * Handles clicks on the Previous button.
 */
function handlePrevious() {
    if (currentQuestionIndex > 0) {
        navigateToQuestion(currentQuestionIndex - 1);
    }
}

/**
 * Handles clicks on the Next button.
 */
function handleNext() {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        navigateToQuestion(currentQuestionIndex + 1);
    }
}

/**
 * Handles the submission of the quiz.
 */
async function handleSubmit() {
    if (isQuizSubmitted) {
        // If already submitted and user clicks 'Submit' (now 'Review Quiz')
        // We'll treat this as finishing the review for now.
        showView('results-screen');
        return;
    }
    
    // 1. Save the final question's answer
    const finalAnswer = getCurrentAnswerFromDOM();
    if (finalAnswer) {
        currentQuiz.userAnswers[currentQuestionIndex] = finalAnswer;
    } else {
        delete currentQuiz.userAnswers[currentQuestionIndex];
    }

    isQuizSubmitted = true;
    
    // 2. Calculate and process results
    const score = processResultsAndRender(currentQuiz.questions, currentQuiz.userAnswers);
    const total = currentQuiz.questions.length;

    // 3. Display the results screen with the score
    updateResultDisplay(score, total);
    showView('results-screen');
    
    // 4. Optionally save the result to the database (async)
    try {
        const user = getCurrentUser();
        if (user) {
            const resultPayload = {
                userId: user.uid,
                topic: currentQuiz.topic,
                difficulty: currentQuiz.difficulty,
                score: score,
                total: total,
                answers: JSON.stringify(currentQuiz.userAnswers),
                // Timestamp will be added by Firestore/Supabase
            };
            await saveResult(resultPayload);
            console.log("[RESULT] Quiz result saved successfully.");
        }
    } catch (error) {
        console.error("[RESULT ERROR] Failed to save quiz result:", error);
    }
    
    // The 'review-complete-btn' listener will be set up below
}


/**
 * Loads the quiz data from the API and sets up the initial state.
 */
async function loadQuiz() {
    isLoading = true;
    updateStatus(`Fetching **${currentQuiz.topic}** questions...`);

    try {
        const questions = await fetchQuestions(currentQuiz.topic, currentQuiz.difficulty);
        
        // --- FIX: Check for empty questions array ---
        if (questions.length === 0) {
             const errorMsg = `No questions found for topic **'${currentQuiz.topic}'** at difficulty **'${currentQuiz.difficulty}'**. Please check the database content (table: 'quizzes') or try a different difficulty/topic.`;
             updateStatus(errorMsg);
             console.error("[QUIZ ERROR]", errorMsg);
             isLoading = false; // Important: reset loading state
             // Stop execution and stay on the loading/status screen with the error message
             return; 
        }
        // --- END FIX ---

        currentQuiz.questions = questions;
        currentQuestionIndex = 0;
        isQuizSubmitted = false;
        currentQuiz.userAnswers = {}; // Reset answers for a new quiz

        // Initial setup
        hideStatus();
        navigateToQuestion(currentQuestionIndex);
        showView('quiz-content');
        
    } catch (error) {
        console.error("[QUIZ ERROR] Failed to load quiz:", error);
        updateStatus(`Failed to load quiz: ${error.message}.`);
        // If it's a fatal API error (like Supabase not initialized), keep showing the status view.
    } finally {
        // Only reset if we didn't hit the "no questions found" return
        if (currentQuiz.questions.length > 0) {
            isLoading = false;
        }
    }
}


/**
 * Main authentication state change handler. Determines flow after sign-in/out.
 * @param {Object|null} user 
 */
async function onAuthChange(user) {
    console.log("[AUTH CHANGE] User state updated. Loading app content...");
    await checkAccessAndLoad(user);
}

/**
 * Checks access and proceeds to load the quiz or show the paywall.
 * @param {Object|null} user 
 */
async function checkAccessAndLoad(user) {
    // 1. Check if the user is authenticated (paywall substitute)
    // Note: checkPaymentStatus currently only checks if a user is logged in
    const hasAccess = await checkPaymentStatus(currentQuiz.topic); 

    if (!hasAccess) {
        console.log("[ACCESS] Access Denied. Showing paywall.");
        updatePaywallContent(currentQuiz.topic);
        showView('paywall-screen');
        // Attach login handler if it hasn't been done
        document.getElementById('login-button')?.addEventListener('click', signInWithGoogle);
        return;
    }
    
    // 2. If access is granted, load the quiz
    console.log("[ACCESS] Access Granted. Loading quiz.");
    showView('loading-status');
    await loadQuiz();
}


// --- Main Application Entry Point ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Parse URL parameters to set context
    const params = new URLSearchParams(window.location.search);
    // Use fallbacks for direct-page navigation
    currentQuiz.class = params.get('class');
    currentQuiz.subject = params.get('subject');
    currentQuiz.topic = params.get('topic') || DEFAULT_TOPIC; 
    currentQuiz.difficulty = params.get('difficulty') || DEFAULT_DIFFICULTY; 
    
    // 2. Display Branding and Tagline immediately
    initBranding(currentQuiz.topic, currentQuiz.difficulty, currentQuiz.subject || 'CBSE 9'); 
    
    // 3. Initialize Auth listener. The listener calls onAuthChange.
    initializeAuthListener(onAuthChange); 
    
    // --- Event Listeners (Must be attached after DOMContentLoaded) ---
    document.getElementById('prev-btn')?.addEventListener('click', handlePrevious);
    document.getElementById('next-btn')?.addEventListener('click', handleNext);
    document.getElementById('submit-button')?.addEventListener('click', handleSubmit);
    document.getElementById('logout-nav-btn')?.addEventListener('click', signOut);

    // After review, return to the start screen (placeholder for now, just clears view)
    document.getElementById('review-complete-btn')?.addEventListener('click', () => {
        showView('loading-status');
        updateStatus("Quiz review finished. Ready for next quiz.");
    });
});
