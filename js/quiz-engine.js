
// js/quiz-engine.js
// Main Application Logic: Orchestrates UI, API calls, and Auth.

import { fetchQuestions, countQuestions, saveResult } from './api.js';
import { initializeAuthListener, signInWithGoogle, signOut, checkPaymentStatus, initiateRazorpayPayment, getCurrentUser } from './auth-paywall.js';
import { showView, updateStatus, hideStatus, renderTitles, renderQuestionCounts, renderQuestions, showFeedback, updateResultDisplay, updateAuthUI } from './ui-renderer.js';

// --- State Variables ---
let currentQuiz = {
    class: '',
    subject: '',
    topic: '',
    difficulty: '',
    questions: [], // Stores the fetched question data
    userAnswers: [],
};

// --- Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Parse URL parameters to set context
    const params = new URLSearchParams(window.location.search);
    currentQuiz.class = params.get('class');
    currentQuiz.subject = params.get('subject');
    currentQuiz.topic = params.get('topic');
    
    // Check if essential parameters are missing (User must be coming from index.html)
    if (!currentQuiz.class || !currentQuiz.subject || !currentQuiz.topic) {
        updateStatus("Error: Missing quiz parameters. Redirecting to selection portal in 5s...", false);
        setTimeout(() => { window.location.href = 'index.html'; }, 5000);
        return;
    }
    
    // 2. Render initial titles and start listening for user auth state
    renderTitles(currentQuiz.class, currentQuiz.subject, currentQuiz.topic);
    initializeAuthListener(handleAuthStateChange);
    
    // 3. Attach Event Listeners for the Paywall/Start Screen
    attachViewListeners();
});

// --- Core Flow Control ---

/**
 * Handles all logic when the user's authentication status changes.
 * @param {Object|null} user - The Firebase user object.
 */
async function handleAuthStateChange(user) {
    updateAuthUI(user);
    updateStatus("Checking access permissions...", true);
    
    const isPaid = await checkPaymentStatus(currentQuiz.topic);

    if (isPaid) {
        updateStatus("Access granted. Loading quiz counts...", true);
        await loadStartScreen(); // User is logged in and paid/premium
    } else {
        // User is not logged in OR is logged in but not paid/premium
        updateStatus("Please log in or purchase access to proceed.", false);
        showView('paywall');
    }
    
    hideStatus();
}

/**
 * Loads the start screen with difficulty options and question counts.
 */
async function loadStartScreen() {
    const counts = { Simple: 0, Medium: 0, Advanced: 0 };
    
    // Fetch question counts for all difficulties concurrently
    const [simpleCount, mediumCount, advancedCount] = await Promise.all([
        countQuestions(currentQuiz.topic, 'Simple'),
        countQuestions(currentQuiz.topic, 'Medium'),
        countQuestions(currentQuiz.topic, 'Advanced'),
    ]);
    
    counts.Simple = simpleCount;
    counts.Medium = mediumCount;
    counts.Advanced = advancedCount;

    renderQuestionCounts(counts);
    showView('start');
}

/**
 * Starts the quiz by fetching questions for the selected difficulty.
 * @param {string} difficulty - 'Simple', 'Medium', or 'Advanced'.
 */
async function startQuiz(difficulty) {
    currentQuiz.difficulty = difficulty;
    updateStatus(`Fetching ${difficulty} questions...`, true);
    
    // Clear previous state
    currentQuiz.questions = [];
    currentQuiz.userAnswers = [];
    
    // 1. Fetch data
    const questions = await fetchQuestions(currentQuiz.topic, difficulty);
    currentQuiz.questions = questions;

    if (questions.length === 0) {
        updateStatus("Error: No questions found for this topic/difficulty. Try again later.", false);
        showView('start'); // Go back to start screen
        return;
    }

    // 2. Render UI
    renderQuestions(questions);
    document.getElementById('difficulty-display').textContent = `Difficulty: ${difficulty}`;
    hideStatus();
    showView('quiz');
}

/**
 * Gathers user answers, submits the quiz, calculates score, and saves results.
 */
function submitQuiz() {
    updateStatus("Submitting answers and calculating score...", true);
    
    const totalQuestions = currentQuiz.questions.length;
    let userAnswers = [];

    // 1. Gather User Answers
    for (let i = 0; i < totalQuestions; i++) {
        const selector = `input[name="question${i}"]:checked`;
        const checkedOption = document.querySelector(selector);
        userAnswers.push(checkedOption ? checkedOption.value.trim() : null);
    }
    
    currentQuiz.userAnswers = userAnswers;

    // 2. Calculate Score and Show Feedback
    const finalScore = showFeedback(currentQuiz.questions, userAnswers);

    // 3. Update Submit Button to 'View Results' / Save to DB
    const submitButton = document.getElementById('submit-button');
    submitButton.textContent = `View Final Score: ${finalScore}/${totalQuestions} >>`;
    submitButton.onclick = () => {
        showResults(finalScore, totalQuestions);
    };

    // 4. Save result to Firestore (Async - don't block the UI)
    const user = getCurrentUser();
    if (user) {
        saveResult(user.uid, currentQuiz.topic, currentQuiz.difficulty, finalScore, totalQuestions);
    }
    
    hideStatus();
}

/**
 * Displays the final score and results screen.
 * @param {number} finalScore 
 * @param {number} totalQuestions 
 */
function showResults(finalScore, totalQuestions) {
    updateResultDisplay(finalScore, totalQuestions);
    showView('results');
}


// --- Event Listener Setup ---

function attachViewListeners() {
    // Paywall/Auth Listeners
    document.getElementById('login-button').addEventListener('click', async () => {
        try {
            await signInWithGoogle();
        } catch (e) {
            updateStatus("Login failed. Please try again.", false);
        }
    });

    document.getElementById('pay-button').addEventListener('click', () => {
        // Pass the item being purchased
        initiateRazorpayPayment(currentQuiz.topic);
    });
    
    document.getElementById('logout-nav-btn').addEventListener('click', signOut);

    // Start Screen (Difficulty Buttons) Listeners
    document.querySelectorAll('.start-quiz-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const difficulty = e.currentTarget.dataset.difficulty;
            startQuiz(difficulty);
        });
    });

    // Quiz Content (Submit Button) Listener
    document.getElementById('submit-button').addEventListener('click', submitQuiz);
}
