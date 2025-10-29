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
    processResultsAndRender
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
 * Saves the current answer to the state and navigates to the specified question index.
 * @param {number} index - The index of the question to show.
 */
function showQuestion(index) {
    // 1. Save the answer for the question we are leaving
    const prevIndex = currentQuestionIndex;
    const userAnswer = getCurrentAnswerFromDOM();
    if (userAnswer) {
        currentQuiz.userAnswers[prevIndex] = userAnswer;
    }

    // 2. Validate the new index
    if (index < 0 || index >= currentQuiz.questions.length) {
        console.error(`Attempted to navigate to invalid question index: ${index}`);
        return;
    }

    // 3. Update state
    currentQuestionIndex = index;
    const totalQuestions = currentQuiz.questions.length;
    
    // 4. Render the new question
    const questionData = currentQuiz.questions[currentQuestionIndex];
    const savedAnswer = currentQuiz.userAnswers[currentQuestionIndex] || null;

    renderQuestion(
        questionData, 
        currentQuestionIndex, 
        totalQuestions, 
        savedAnswer,
        isQuizSubmitted
    );

    // 5. Update navigation buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-button');
    
    // Previous button logic
    if (currentQuestionIndex > 0) {
        prevBtn.classList.remove('invisible');
    } else {
        prevBtn.classList.add('invisible');
    }
    
    // Next/Submit button logic
    if (currentQuestionIndex < totalQuestions - 1) {
        nextBtn.classList.remove('hidden');
        nextBtn.textContent = 'Next Question';
        submitBtn.classList.add('hidden');
    } else {
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
    }
    
    // If the quiz is submitted, re-render the results view immediately after showing the question
    if (isQuizSubmitted) {
         processResultsAndRender(currentQuiz.questions, currentQuiz.userAnswers);
    }
}

/**
 * Handles the 'Next' button click.
 */
function handleNext() {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        showQuestion(currentQuestionIndex + 1);
    }
}

/**
 * Handles the 'Previous' button click.
 */
function handlePrevious() {
    if (currentQuestionIndex > 0) {
        showQuestion(currentQuestionIndex - 1);
    }
}

/**
 * Handles the 'Submit' button click.
 * Finalizes the quiz, calculates score, saves results, and displays the result screen.
 */
async function handleSubmit() {
    if (isQuizSubmitted) {
        // If already submitted, maybe go back to the first question to review
        return showQuestion(0);
    }

    // 1. Save the answer for the final question
    const finalAnswer = getCurrentAnswerFromDOM();
    if (finalAnswer) {
        currentQuiz.userAnswers[currentQuestionIndex] = finalAnswer;
    }
    
    // 2. Mark as submitted and hide navigation buttons
    isQuizSubmitted = true;
    document.getElementById('prev-btn').classList.add('hidden');
    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('submit-button').classList.add('hidden');

    // 3. Process results and calculate score
    const { score, total } = processResultsAndRender(currentQuiz.questions, currentQuiz.userAnswers);

    // 4. Update the results view
    updateResultDisplay(score, total);
    showView('results-screen');
    updateStatus('Quiz submitted! Calculating final results...');

    // 5. Prepare and save the result (API call)
    const user = getCurrentUser();
    const quizResult = {
        userId: user ? user.uid : 'anonymous',
        topic: currentQuiz.topic,
        difficulty: currentQuiz.difficulty,
        score: score,
        totalQuestions: total,
        timestamp: new Date().toISOString(),
        answers: JSON.stringify(currentQuiz.userAnswers) // Save answers as string for Firestore limits
    };

    try {
        await saveResult(quizResult);
        console.log("[QUIZ] Result saved successfully.");
        updateStatus(`Great job! Final Score: ${score} out of ${total}`);
    } catch (e) {
        console.error("[QUIZ ERROR] Failed to save quiz result:", e);
        updateStatus(`Error saving results. Your score is ${score}/${total}, but the result could not be recorded.`);
    }

    // After submission, change the 'Review Quiz' button to 'Review Quiz' (already handled in UI)
    document.getElementById('review-quiz-btn').onclick = () => {
        showView('quiz-view');
        showQuestion(0); // Start review from the beginning
    };
    
    // Update the submit button text for review
    document.getElementById('submit-button').textContent = 'Review Quiz';
    
}


/**
 * Loads the quiz data, initializes the state, and starts the quiz display.
 */
async function loadQuiz() {
    updateStatus(`Loading quiz data for topic: ${currentQuiz.topic}...`);

    try {
        // 1. Fetch questions from the API
        const fetchedQuestions = await fetchQuestions(currentQuiz.topic, currentQuiz.difficulty);
        currentQuiz.questions = fetchedQuestions;
        
        // 2. Check if questions were found
        if (currentQuiz.questions.length === 0) {
            throw new Error("No questions available for this selection.");
        }
        
        // 3. Initialize state
        currentQuestionIndex = 0;
        currentQuiz.userAnswers = {};

        // 4. Render header titles
        renderTitles(currentQuiz.topic, `Total Questions: ${currentQuiz.questions.length}`, currentQuiz.difficulty);

        // 5. Show the first question
        showQuestion(currentQuestionIndex);
        
        showView('quiz-view');
        hideStatus();

    } catch (error) {
        console.error("Quiz Initialization Failed:", error);
        // Generic user-facing failure message
        updateStatus(`Failed to load quiz content. Please try refreshing or check your internet connection. (${error.message})`);
    }
}


// --- Initialization ---

// Global function to be passed to initializeAuthListener
function onAuthChange(user) {
    if (user) {
        console.log(`[QUIZ] User is logged in: ${user.email}`);
        // Optionally, check payment status again or enable features
    } else {
        console.log("[QUIZ] User logged out or anonymous.");
    }
    // No action needed here, as the paywall check is done separately in DOMContentLoaded
}


document.addEventListener('DOMContentLoaded', async () => {
    // 1. Parse URL parameters to set context
    const params = new URLSearchParams(window.location.search);
    currentQuiz.class = params.get('class');
    currentQuiz.subject = params.get('subject');
    currentQuiz.topic = params.get('topic');
    currentQuiz.difficulty = params.get('difficulty') || 'medium'; 

    // 2. Display Branding and Tagline immediately
    initBranding(); 
    
    // 3. Initialize Auth listener
    initializeAuthListener(onAuthChange); 
    
    // 4. Check Payment/Subscription status
    // Note: The checkPaymentStatus will either show the quiz-view or the paywall-screen.
    if (!checkPaymentStatus(currentQuiz.topic)) {
        // If access is denied, the auth-paywall.js will show the paywall screen.
        // We stop execution here.
        updateStatus(`Access Denied: Please subscribe to view the '${currentQuiz.topic}' quiz.`);
        return; 
    }
    
    // If access is granted, proceed to load the quiz
    showView('loading-status');

    // 5. Load the Quiz Data
    await loadQuiz();
    
    // --- Event Listeners ---
    document.getElementById('prev-btn')?.addEventListener('click', handlePrevious);
    document.getElementById('next-btn')?.addEventListener('click', handleNext);
    document.getElementById('submit-button')?.addEventListener('click', handleSubmit);
    document.getElementById('review-quiz-btn')?.addEventListener('click', handleSubmit); // Will be repurposed later
});
