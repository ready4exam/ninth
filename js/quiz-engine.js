import { fetchQuestions, saveResult } from './api.js';
import { initializeAuthListener, checkPaymentStatus, getCurrentUser } from './auth-paywall.js';
import { 
    showView, 
    updateStatus, 
    hideStatus, 
    renderTitles, 
    renderQuestion, 
    updateResultDisplay,
    initBranding,
    processResultsAndRender,
    getElements
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


/**
 * Retrieves the user's current answer from the DOM (selected radio button).
 * @returns {string | null} The selected answer string, or null if none is selected.
 */
function getCurrentAnswerFromDOM() {
    // Get the question container element directly from the UI renderer
    const elements = getElements();
    const questionContainer = elements.questionList.children[0];
    
    // Check if the container exists and has radio inputs
    if (!questionContainer) return null;

    const selectedInput = questionContainer.querySelector('input[type="radio"]:checked');
    if (selectedInput) {
        // Find the corresponding label for the text content
        const label = questionContainer.querySelector(`label[for="${selectedInput.id}"]`);
        // The value property of the radio input holds the actual option text
        return selectedInput.value;
    }
    return null;
}

/**
 * Saves the current answer to the state and navigates to the specified question index.
 * @param {number} index - The index of the question to show.
 * @param {boolean} [shouldSaveCurrent=true] - Whether to save the answer for the current question before navigating.
 */
function navigateToQuestion(index, shouldSaveCurrent = true) {
    if (currentQuiz.questions.length === 0) {
        console.warn("[ENGINE] Cannot navigate: No questions loaded.");
        return;
    }
    
    // 1. Save the answer for the question we are leaving (if it was a valid question)
    if (shouldSaveCurrent && currentQuiz.questions[currentQuestionIndex]) {
        currentQuiz.userAnswers[currentQuestionIndex] = getCurrentAnswerFromDOM();
        // Log the saved answer (optional)
        console.log(`Answer saved for Q${currentQuestionIndex}: ${currentQuiz.userAnswers[currentQuestionIndex]}`);
    }

    // 2. Validate the new index
    if (index >= 0 && index < currentQuiz.questions.length) {
        currentQuestionIndex = index;
        const question = currentQuiz.questions[currentQuestionIndex];
        
        // 3. Render the question and restore the saved answer
        renderQuestion(question, currentQuestionIndex, currentQuiz.userAnswers[currentQuestionIndex], isQuizSubmitted);
        
        // 4. Update navigation button visibility
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-button');
        
        prevBtn.disabled = currentQuestionIndex === 0;

        if (currentQuestionIndex === currentQuiz.questions.length - 1) {
            nextBtn.classList.add('hidden');
            if (!isQuizSubmitted) {
                submitBtn.classList.remove('hidden');
            }
        } else {
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
        }
    }
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
    navigateToQuestion(currentQuestionIndex + 1);
}

/**
 * Loads the quiz data and transitions the UI.
 */
async function loadQuiz() {
    // Set status to inform the user what is happening
    updateStatus(`Loading quiz for **${currentQuiz.topic}**...`);
    
    try {
        // The fetchQuestions now correctly uses 'topic_slug' and throws an error if empty
        const questions = await fetchQuestions(currentQuiz.topic, currentQuiz.difficulty);
        
        // If the array is empty, the function should have thrown, but a safety check doesn't hurt.
        if (questions.length === 0) {
            throw new Error(`No questions found for topic '${currentQuiz.topic}' at difficulty '${currentQuiz.difficulty}'. Check database content.`);
        }

        currentQuiz.questions = questions;
        renderTitles(currentQuiz.topic, currentQuiz.difficulty, currentQuiz.questions.length);
        
        showView('quiz-content');
        navigateToQuestion(0, false); // Start at the first question without saving an initial answer
        hideStatus();

    } catch (error) {
        console.error("[QUIZ ENGINE ERROR] Failed to load quiz:", error);
        // Display the error message to the user on the loading screen
        updateStatus(`[QUIZ ERROR] ${error.message}. Please ensure the correct difficulty is selected or check your database.`);
        // Ensure only the status/loading screen is visible
        showView('loading-status');
    }
}

/**
 * Handles quiz submission.
 */
async function handleSubmit() {
    // 1. Final save for the current question
    currentQuiz.userAnswers[currentQuestionIndex] = getCurrentAnswerFromDOM();
    
    // 2. Prevent further submission
    if (isQuizSubmitted) {
        // If already submitted, this button is acting as 'Review Complete'
        showView('start-screen');
        return;
    }
    
    isQuizSubmitted = true;
    showView('loading-status');
    updateStatus("Submitting and calculating results...");

    // 3. Calculate Score (A simplified process, as full scoring should be on the server)
    let score = 0;
    const total = currentQuiz.questions.length;

    currentQuiz.questions.forEach((q, index) => {
        // Get the saved answer (this is the value/text of the selected option)
        const userAnswer = currentQuiz.userAnswers[index]; 
        // Get the correct answer from the question object
        const correctAnswer = q.correct_answer; 
        
        if (userAnswer === correctAnswer) {
            score++;
        }
    });

    // 4. Update the results display
    updateResultDisplay(score, total);
    
    // 5. Save the result via API (Async, but we don't wait for it to complete the UI transition)
    const quizResult = {
        topic: currentQuiz.topic,
        difficulty: currentQuiz.difficulty,
        score: score,
        total: total,
        user: getCurrentUser() ? getCurrentUser().uid : 'anonymous',
    };
    saveResult(quizResult).catch(e => console.error("Failed to save result:", e));

    // 6. Transition to results view
    showView('results-screen');
    hideStatus();
}

/**
 * Wrapper function to check access and load the quiz if authorized.
 * @param {Object|null} user - The current Firebase user object.
 */
async function checkAccessAndLoad(user) {
    // updateStatus(`Authenticating user access...`);
    
    // If the user has access (either paid or authenticated based on current logic)
    // NOTE: checkPaymentStatus logic is simplified in auth-paywall.js to only check if user is authenticated.
    if (await checkPaymentStatus()) { 
        showView('loading-status');
        await loadQuiz(); // Proceed to load the quiz
    } else {
        // If access is denied (not logged in)
        renderTitles(currentQuiz.topic, currentQuiz.difficulty);
        showView('paywall-screen');
        // The paywall content must be updated before showing the screen
        const { updatePaywallContent } = await import('./ui-renderer.js');
        updatePaywallContent(currentQuiz.topic);
        hideStatus();
    }
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Parse URL parameters to set context
    const params = new URLSearchParams(window.location.search);
    currentQuiz.class = params.get('class');
    currentQuiz.subject = params.get('subject');
    // Note: The value from the URL parameter 'topic' is the 'topic_slug'
    currentQuiz.topic = params.get('topic'); 
    
    // *** CRITICAL FIX: Set default difficulty to 'difficult' for testing ***
    // This allows the quiz to fetch data since you confirmed it's only available
    // for this level.
    currentQuiz.difficulty = params.get('difficulty') || 'difficult'; 

    // 2. Display Branding and Tagline immediately
    initBranding(); 
    
    // 3. Initialize Auth listener, which runs checkAccessAndLoad on state change
    initializeAuthListener(checkAccessAndLoad); 
    
    // --- Event Listeners ---
    document.getElementById('prev-btn')?.addEventListener('click', handlePrevious);
    document.getElementById('next-btn')?.addEventListener('click', handleNext);
    document.getElementById('submit-button')?.addEventListener('click', handleSubmit);
    document.getElementById('review-quiz-btn')?.addEventListener('click', handleSubmit); 
});
