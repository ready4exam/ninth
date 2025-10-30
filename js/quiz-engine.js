// js/quiz-engine.js
import { initServices, getAuthUser } from './config.js';
import { fetchQuestions, saveResult } from './api.js';
import * as UI from './ui-renderer.js';
import { initializeAuthListener, checkAccess } from './auth-paywall.js'; 

// --- Global State ---\n
let quizState = {
    // Parsed from URL
    classId: null,
    subject: null,
    subSubject: null, // New field for Science/Social Science
    topicSlug: null,
    difficulty: null,
    
    // Quiz data
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: {}, // Stores { questionIndex: selectedOptionIndex }
    isSubmitted: false,
    score: 0,
};

// --- Core Initialization ---\n

/**
 * Parses URL parameters into the quizState.
 */
function parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    quizState.classId = urlParams.get('class');
    quizState.subject = urlParams.get('subject');
    quizState.subSubject = urlParams.get('sub_subject'); // e.g., 'Physics'
    quizState.topicSlug = urlParams.get('topic'); // e.g., 'motion'
    quizState.difficulty = urlParams.get('difficulty'); // e.g., 'simple' or 'medium'
    
    // --- PILOT ENFORCEMENT ---
    if (quizState.topicSlug !== 'motion' || quizState.classId !== '9') {
         UI.updateStatus(`
            <span class="text-red-500">Error: Pilot Topic Required.</span> 
            This quiz engine is currently configured ONLY for **Class 9 / Motion** topic.
        `);
        throw new Error("Quiz topic must be 'motion' and Class must be '9' for the pilot.");
    }

    if (!quizState.classId || !quizState.subject || !quizState.topicSlug || !quizState.difficulty) {
        throw new Error("Missing required URL parameters (class, subject, topic, difficulty).");
    }
}

/**
 * Renders the question UI for the current index.
 */
function renderCurrentQuestion() {
    const question = quizState.questions[quizState.currentQuestionIndex];
    if (!question) return;

    // Use the UI renderer to generate the question HTML
    const questionHtml = UI.renderQuestion(
        question, 
        quizState.currentQuestionIndex, 
        quizState.isSubmitted, 
        quizState.userAnswers[quizState.currentQuestionIndex]
    );

    const questionListEl = UI.getElements().questionList;
    if (questionListEl) {
        questionListEl.innerHTML = questionHtml;
        // Re-render Lucide icons for new content
        lucide.createIcons();
    }
    
    // Update question indicator
    document.getElementById('question-indicator').textContent = 
        `Question ${quizState.currentQuestionIndex + 1} of ${quizState.questions.length}`;

    // Update navigation buttons state
    updateNavButtons();
    
    // Attach new event listener to the radio inputs
    const inputs = questionListEl.querySelectorAll('input[type="radio"]');
    inputs.forEach(input => {
        // Only attach listener if quiz is not submitted
        if (!quizState.isSubmitted) {
            input.addEventListener('change', handleAnswerChange);
        }
    });
}

/**
 * Handles the user selecting an answer.
 */
function handleAnswerChange(event) {
    const selectedOptionIndex = parseInt(event.target.value, 10);
    const questionIndex = parseInt(event.target.dataset.qIndex, 10);
    
    quizState.userAnswers[questionIndex] = selectedOptionIndex;
    
    console.log(`Answer recorded for Q${questionIndex}: Option ${selectedOptionIndex}`);
    
    // If this is the last question, reveal the submit button
    if (questionIndex === quizState.questions.length - 1) {
        UI.getElements().submitButton.classList.remove('hidden');
    }
}


/**
 * Updates the state of the Previous/Next navigation buttons.
 */
function updateNavButtons() {
    const prevButton = document.getElementById('prev-btn');
    const nextButton = document.getElementById('next-btn');

    prevButton.disabled = quizState.currentQuestionIndex === 0;
    nextButton.disabled = quizState.currentQuestionIndex === quizState.questions.length - 1;
    
    // In review mode (submitted), the submit button is hidden, 
    // but in quiz mode, we show it on the last question.
    UI.getElements().submitButton.classList.toggle(
        'hidden', 
        quizState.isSubmitted || quizState.currentQuestionIndex !== quizState.questions.length - 1
    );
}

/**
 * Handles navigation between questions.
 * @param {1|-1} direction - 1 for next, -1 for previous.
 */
function handleNavigation(direction) {
    let newIndex = quizState.currentQuestionIndex + direction;
    
    if (newIndex >= 0 && newIndex < quizState.questions.length) {
        quizState.currentQuestionIndex = newIndex;
        renderCurrentQuestion();
    }
}

/**
 * Calculates the final score and updates the UI to review mode.
 */
async function handleSubmit() {
    UI.hideStatus();
    console.log("[ENGINE] Submitting quiz...");
    
    let correctCount = 0;
    const totalQuestions = quizState.questions.length;
    
    quizState.questions.forEach((q, index) => {
        const userAnswer = quizState.userAnswers[index];
        if (userAnswer === q.correct_option_index) {
            correctCount++;
        }
    });

    quizState.score = correctCount;
    quizState.isSubmitted = true;
    
    // 1. Update the results screen with score
    UI.renderScore(correctCount, totalQuestions);
    
    // 2. Switch to results view (which also hides the submit button)
    UI.showView('results-screen');
    
    // 3. Render all questions in review mode (for persistent display in results view)
    const reviewHtml = quizState.questions.map((q, index) => 
        UI.renderQuestion(q, index, true, quizState.userAnswers[index])
    ).join('');
    UI.getElements().questionList.innerHTML = reviewHtml;
    lucide.createIcons();
    
    // 4. Reset to the first question for review navigation
    quizState.currentQuestionIndex = 0;
    renderCurrentQuestion();
    
    // 5. Store the score in Firestore (only if Google-signed-in)
    const resultData = {
        classId: quizState.classId,
        subject: quizState.subject,
        subSubject: quizState.subSubject,
        topicSlug: quizState.topicSlug,
        difficulty: quizState.difficulty,
        score: quizState.score,
        totalQuestions: totalQuestions,
        answers: JSON.stringify(quizState.userAnswers), // Store answers as JSON string
    };
    await saveResult(resultData);
}

/**
 * Handles the main quiz loading workflow.
 * @param {firebase.User|null} user - The authenticated user object.
 */
async function loadQuiz(user) {
    const isAccessGranted = checkAccess();
    
    if (!isAccessGranted) {
        // Access denied: Show the Sign-In Required screen
        UI.updateQuizMetadata(`Class ${quizState.classId} - ${quizState.topicSlug.toUpperCase()}`, quizState.difficulty);
        UI.updatePaywallContent(quizState.topicSlug);
        UI.showView('paywall-screen');
        UI.hideStatus();
        return;
    }

    try {
        UI.updateStatus('Fetching questions...');
        
        // 1. Fetch questions from Supabase (10/5/5 mix)
        const fetchedQuestions = await fetchQuestions(quizState.topicSlug, quizState.difficulty);
        
        if (fetchedQuestions.length === 0) {
            throw new Error("No questions found for this topic/difficulty combination.");
        }
        
        quizState.questions = fetchedQuestions;
        quizState.currentQuestionIndex = 0;
        quizState.userAnswers = {}; // Reset answers on load
        quizState.isSubmitted = false;
        
        // 2. Update UI Metadata
        const title = `${quizState.subSubject || quizState.subject} - ${quizState.questions[0].chapter_title || quizState.topicSlug}`;
        UI.updateQuizMetadata(title, quizState.difficulty);
        
        // 3. Show the quiz and render the first question
        UI.showView('quiz-content');
        renderCurrentQuestion();
        
        UI.hideStatus();
        console.log(`[ENGINE] Quiz loaded with ${quizState.questions.length} questions.`);

    } catch (error) {
        console.error("[ENGINE ERROR] Quiz load failed:", error);
        UI.updateStatus(`
            <span class="text-red-600">ERROR: Failed to load quiz.</span> 
            <p class="mt-2">Reason: ${error.message}</p>
            <p class="mt-2">Check Supabase configuration and data for the topic 'motion'.</p>
        `);
    }
}

/**
 * Initializes the entire quiz engine application.
 */
async function initQuizEngine() {
    try {
        parseUrlParameters();
        UI.updateStatus('Initializing services and checking authentication...');
        
        // 1. Initialize Firebase/Supabase services
        await initServices(); 
        
        // 2. Set up Auth Listener (will trigger loadQuiz on state change)
        initializeAuthListener(loadQuiz);
        
        // 3. Attach standard listeners
        const elements = UI.getElements();
        const prevButton = document.getElementById('prev-btn');
        const nextButton = document.getElementById('next-btn');
        
        if (prevButton) prevButton.addEventListener('click', () => handleNavigation(-1));
        if (nextButton) nextButton.addEventListener('click', () => handleNavigation(1));
        
        // Submit button
        if (elements.submitButton) elements.submitButton.addEventListener('click', handleSubmit);
        
        // Review button (just hides the whole container)
        const reviewCompleteBtn = document.getElementById('review-complete-btn');
        if (reviewCompleteBtn) reviewCompleteBtn.addEventListener('click', () => {
            alert('Review complete! Redirecting to chapter selection.');
            window.location.href = `chapter-selection.html?subject=${quizState.subject}`;
        });
        
        // NOTE: Auth buttons are handled by listeners added in auth-paywall.js
        
    } catch (error) {
        console.error("[ENGINE FATAL] Initialization failed:", error);
        // Display the error thrown by parseUrlParameters or initServices
        UI.updateStatus(`
            <span class="text-red-600">CRITICAL ERROR: Initialization Failed.</span> 
            <p class="mt-2">Reason: ${error.message}</p>
        `);
    }
}


// Expose public methods for use in HTML
window.quizEngine = window.quizEngine || {};
window.quizEngine.handleSignIn = window.quizEngine?.handleSignIn; 
window.quizEngine.handleSignOut = window.quizEngine?.handleSignOut;
window.quizEngine.clearStatus = UI.hideStatus;
// Do not expose loadQuiz directly, let it be triggered by the auth listener

// Start the engine once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initQuizEngine);
