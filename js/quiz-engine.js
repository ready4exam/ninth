// js/quiz-engine.js
import { initializeServices, getAuthUser } from './config.js'; // FIX: Renamed import to initializeServices
import { fetchQuestions, saveResult } from './api.js';
import * as UI from './ui-renderer.js';
import { checkAccess, initializeAuthListener, signInWithGoogle, signOut } from './auth-paywall.js'; 

// --- Global State ---
let quizState = {
    // Parsed from URL
    classId: null,
    subject: null,
    topicSlug: null,
    difficulty: null,
    
    // Quiz data
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: {},
    isSubmitted: false,
    score: 0,
};

// --- Core Initialization ---

/**
 * Parses URL parameters into the quizState.
 */
function parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    quizState.classId = urlParams.get('class');
    quizState.subject = urlParams.get('subject');
    quizState.topicSlug = urlParams.get('topic'); // e.g., 'motion'
    quizState.difficulty = urlParams.get('difficulty'); // e.g., 'simple' or 'medium'
    
    // Enforce the requirement: only run the quiz if the topic is 'motion'
    if (quizState.topicSlug !== 'motion') {
         UI.updateStatus(`
            <span class="text-red-500">Error: Invalid Topic.</span> 
            This quiz engine is currently configured ONLY for the **Motion** topic. Found: ${quizState.topicSlug}
        `);
        throw new Error("Quiz topic must be 'motion'.");
    }
    
    // Set the UI title
    UI.updateHeader(quizState.topicSlug, quizState.difficulty);
}

/**
 * Renders the current question based on quizState.currentQuestionIndex.
 */
function renderQuestion() {
    const q = quizState.questions[quizState.currentQuestionIndex];
    if (!q) return;

    UI.renderQuestion(q, quizState.currentQuestionIndex + 1, quizState.userAnswers[q.id], quizState.isSubmitted);
    UI.updateNavigation(quizState.currentQuestionIndex, quizState.questions.length, quizState.isSubmitted);
    UI.hideStatus();
}

/**
 * Handles navigation to the previous or next question.
 * @param {number} direction - -1 for previous, 1 for next.
 */
function handleNavigation(direction) {
    const newIndex = quizState.currentQuestionIndex + direction;
    const totalQuestions = quizState.questions.length;
    
    if (newIndex >= 0 && newIndex < totalQuestions) {
        quizState.currentQuestionIndex = newIndex;
        renderQuestion();
    }
}

/**
 * Handles user selecting an answer option.
 * @param {string} questionId - The ID of the question.
 * @param {string} selectedOption - The option letter selected (A, B, C, D).
 */
function handleAnswerSelection(questionId, selectedOption) {
    if (quizState.isSubmitted) return; // Cannot change answers after submission
    
    // Store the answer
    quizState.userAnswers[questionId] = selectedOption;
    
    // Re-render to reflect the selected state
    renderQuestion(); 
}

/**
 * Calculates the score and renders the results screen.
 */
async function handleSubmit() {
    quizState.isSubmitted = true;
    quizState.score = 0;
    
    quizState.questions.forEach(q => {
        const userAnswer = quizState.userAnswers[q.id];
        // NOTE: Answer keys are expected to be provided in the fetched data.
        if (userAnswer === q.correct_answer) {
            quizState.score++;
        }
    });

    // Save the result to the API (Firestore)
    const resultData = {
        classId: quizState.classId,
        subject: quizState.subject,
        topic: quizState.topicSlug,
        difficulty: quizState.difficulty,
        score: quizState.score,
        total: quizState.questions.length,
        user_answers: quizState.userAnswers,
    };
    
    await saveResult(resultData);

    // Render feedback on all questions
    UI.renderAllQuestionsForReview(quizState.questions, quizState.userAnswers);
    
    // Show results screen
    UI.showResults(quizState.score, quizState.questions.length);

    // Re-attach listeners for review navigation
    UI.attachReviewListeners(handleNavigation);
    
    // Hide navigation buttons once submitted, or keep them for review
    UI.updateNavigation(quizState.currentQuestionIndex, quizState.questions.length, true);
}


/**
 * Main function to load the quiz after checks are passed.
 */
async function loadQuiz() {
    try {
        UI.showStatus("Fetching questions...", "text-blue-600");
        
        const questions = await fetchQuestions(quizState.topicSlug, quizState.difficulty);
        quizState.questions = questions;

        if (questions.length === 0) {
            UI.updateStatus("<span class=\"text-red-600\">Error:</span> No questions found for this topic/difficulty.", "text-red-600");
            return;
        }

        // Initialize userAnswers with an empty value for each question
        quizState.questions.forEach(q => {
            quizState.userAnswers[q.id] = null;
        });

        // Set up the first question view
        quizState.currentQuestionIndex = 0;
        renderQuestion();
        
        // Attach event listener for user option selection (delegation)
        UI.attachAnswerListeners(handleAnswerSelection);
        UI.showView('quiz-content'); // Show the main quiz area

    } catch (error) {
        console.error("[ENGINE ERROR] Failed to load quiz:", error);
        UI.updateStatus(`<span class="text-red-600">ERROR:</span> Could not load quiz questions. ${error.message}`, "text-red-600");
    }
}

/**
 * Main handler run when authentication state changes.
 * @param {Object} user - The authenticated Firebase user object (or null).
 */
async function onAuthChange(user) {
    if (user) {
        // 1. User is authenticated, check payment/access status
        UI.showStatus(`Checking access for user: ${user.email || 'Anonymous'}...`, "text-blue-600");
        const hasAccess = await checkAccess(quizState.topicSlug);

        if (hasAccess) {
            await loadQuiz();
        } else {
            // Access denied due to paywall (if checkAccess was active)
            UI.updatePaywallContent(quizState.topicSlug);
            UI.showView('paywall-screen');
        }
    } else {
        // 2. User is logged out / anonymous
        UI.showStatus("Please sign in to access premium quizzes.", "text-yellow-600");
        
        // Check access for anonymous user (will likely fail unless topic is free)
        const hasAccess = await checkAccess(quizState.topicSlug);
        
        if (hasAccess) {
             await loadQuiz();
        } else {
            // Default to paywall for anonymous users
            UI.updatePaywallContent(quizState.topicSlug);
            UI.showView('paywall-screen');
        }
    }
}


/**
 * Initializes the quiz engine: parses params, initializes services, and sets up listeners.
 */
async function initQuizEngine() {
    try {
        UI.initializeElements(); // Get all DOM elements first
        parseUrlParameters();
        
        // 1. Initialize services (Firebase/Supabase)
        UI.showStatus("Initializing core services...", "text-blue-600");
        await initializeServices(); // Correctly calls initializeServices
        
        // 2. Initialize the Auth Listener (kicks off the whole flow via onAuthChange)
        initializeAuthListener(onAuthChange); 
        
        // 3. Attach common event listeners
        const elements = UI.getElements();

        // Navigation buttons
        const prevButton = document.getElementById('prev-btn');
        const nextButton = document.getElementById('next-btn');

        if (prevButton) prevButton.addEventListener('click', () => handleNavigation(-1));
        if (nextButton) nextButton.addEventListener('click', () => handleNavigation(1));
        
        // Submit button
        if (elements.submitButton) elements.submitButton.addEventListener('click', handleSubmit);
        
        // Auth buttons
        if (elements.loginButton) elements.loginButton.addEventListener('click', signInWithGoogle); // Use imported signInWithGoogle
        if (elements.logoutNavBtn) elements.logoutNavBtn.addEventListener('click', signOut); // Use imported signOut
        
        // Review button
        const reviewCompleteBtn = document.getElementById('review-complete-btn');
        if (reviewCompleteBtn) reviewCompleteBtn.addEventListener('click', () => {
             // Reloads the index page or whatever the final destination is
             window.location.href = "index.html";
        });
        
    } catch (error) {
        console.error("[ENGINE FATAL] Initialization failed:", error);
        // Display the error thrown by parseUrlParameters or initServices
        UI.updateStatus(`
            <span class="text-red-600">CRITICAL ERROR: Initialization Failed.</span> 
            <p class="mt-2">Reason: ${error.message}</p>
        `);
    }
}

// Start the engine once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initQuizEngine);
