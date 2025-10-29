import { fetchQuestions, saveResult } from './api.js';
import { initializeAuthListener, signInWithGoogle, signOut, checkAccess } from './auth-paywall.js';
import { showView, updateStatus, updateHeader, renderQuestionList, showResults, updateResultDisplay, updateAuthUI, updatePaywallContent, getElements } from './ui-renderer.js';

// --- Global Quiz State ---
const currentQuiz = {
    class: null,
    subject: null,
    topic: null, // The slug (e.g., 'gravitation')
    topicName: null, // The friendly name (e.g., 'Gravitation')
    difficulty: 'medium',
    questions: [],
    userAnswers: [], // Array to store answers: [null, 'Option B', null, ...]
    isSubmitted: false,
};

// --- Initialization Helpers ---

/**
 * Placeholder for fetching the friendly topic name (e.g., 'gravitation' -> 'Gravitation').
 * In a real app, this would come from a dedicated config/lookup table.
 * For now, it just capitalizes the slug.
 * @param {string} slug 
 */
function getTopicFriendlyName(slug) {
    if (!slug) return 'Unknown Topic';
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}


/**
 * Loads the quiz data and determines the view to show.
 */
async function loadQuiz() {
    updateStatus("Loading quiz content...");
    
    currentQuiz.topicName = getTopicFriendlyName(currentQuiz.topic);
    updateHeader(`${currentQuiz.topicName} Quiz`, currentQuiz.topicName, currentQuiz.difficulty);

    // 1. Check Access
    const hasAccess = await checkAccess(currentQuiz.topic); 

    if (!hasAccess) {
        updatePaywallContent(currentQuiz.topicName);
        showView('paywall-screen');
        updateStatus("Access denied.");
        return; 
    }
    
    try {
        // 2. Fetch Questions
        currentQuiz.questions = await fetchQuestions(currentQuiz.topic, currentQuiz.difficulty);
        
        // 3. Initialize user answers array
        currentQuiz.userAnswers = new Array(currentQuiz.questions.length).fill(null);
        
        // 4. Render Quiz and show view
        renderQuestionList(currentQuiz.questions, handleOptionSelect);

        // Attach event listener for submit button (moved here to ensure it's attached only once)
        getElements().submitButton?.addEventListener('click', handleSubmitQuiz);
        
        showView('quiz-content');
        updateStatus(`Quiz loaded. ${currentQuiz.questions.length} questions available.`);

    } catch (error) {
        console.error("Quiz Initialization Failed:", error);
        // Generic user-facing failure message
        updateStatus(`Failed to load quiz content. Please try refreshing or check your internet connection. (${error.message})`);
    }
}

// --- Event Handlers ---

/**
 * Handles selection of a radio option for a question.
 * @param {number} index - The index of the question in the array.
 * @param {string} selectedAnswer - The text value of the selected answer.
 */
function handleOptionSelect(index, selectedAnswer) {
    if (currentQuiz.isSubmitted) return; // Prevent changes after submission
    currentQuiz.userAnswers[index] = selectedAnswer;
}


/**
 * Handles the submission of the entire quiz.
 */
async function handleSubmitQuiz() {
    if (currentQuiz.isSubmitted) return; 

    // 1. Calculate and display results on the UI
    const score = showResults(currentQuiz.questions, currentQuiz.userAnswers);
    currentQuiz.isSubmitted = true;
    
    // 2. Hide the submit button
    getElements().submitButton.classList.add('hidden');

    // 3. Show the results screen (but we need to wait for the user to scroll through)
    // For a smoother UX, we will scroll to the top of the quiz results element after a slight delay
    // and then display the results summary.
    setTimeout(() => {
        updateResultDisplay(score, currentQuiz.questions.length);
        showView('results-screen');
        document.getElementById('results-screen').scrollIntoView({ behavior: 'smooth' });
    }, 500);


    // 4. Save result to database (API call)
    const resultToSave = {
        topic: currentQuiz.topic,
        difficulty: currentQuiz.difficulty,
        score: score,
        totalQuestions: currentQuiz.questions.length,
        userAnswers: currentQuiz.userAnswers.map((ans, i) => ({
            questionId: currentQuiz.questions[i].id, // Assuming each question has an ID
            userAnswer: ans,
            correctAnswer: currentQuiz.questions[i].options[currentQuiz.questions[i].correctAnswerIndex],
            isCorrect: ans === currentQuiz.questions[i].options[currentQuiz.questions[i].correctAnswerIndex],
        })),
    };

    try {
        await saveResult(resultToSave);
        console.log("Quiz results saved successfully.");
    } catch (e) {
        console.error("Failed to save quiz results:", e);
    }
}

/**
 * Handles the sign-in process via the UI.
 */
async function handleSignIn() {
    try {
        const user = await signInWithGoogle();
        if (user) {
            // After successful sign-in, re-run loadQuiz to check access status again
            await loadQuiz(); 
        }
    } catch (e) {
        console.error("Sign in failed:", e);
        updateStatus("Sign-in failed. Please try again.");
    }
}

/**
 * Handles the sign-out process.
 */
function handleSignOut() {
    signOut(); // signOut will trigger the auth listener, which updates the UI
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Parse URL parameters to set context
    const params = new URLSearchParams(window.location.search);
    currentQuiz.class = params.get('class'); // Currently unused
    currentQuiz.subject = params.get('subject'); // Currently unused
    currentQuiz.topic = params.get('topic');
    currentQuiz.difficulty = params.get('difficulty') || 'medium'; 
    
    if (!currentQuiz.topic) {
        updateStatus("Error: No quiz topic specified in the URL.");
        return;
    }
    
    // 2. Attach Auth UI Listeners
    initializeAuthListener(updateAuthUI);
    
    // 3. Attach Paywall/Auth Action Listeners
    getElements().loginButton?.addEventListener('click', handleSignIn);
    getElements().logoutNavBtn?.addEventListener('click', handleSignOut);
    getElements().payButton?.addEventListener('click', () => {
        // Simple Razorpay flow
        // In a real app, you'd calculate amount based on topic
        window.open('https://razorpay.com/payment-link-demo', '_blank'); // Open demo link
        console.log("Simulating payment attempt...");
    });
    
    // 4. Load the Quiz Data
    await loadQuiz();
});
