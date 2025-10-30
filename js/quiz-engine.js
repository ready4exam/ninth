// js/quiz-engine.js
import { initServices, isAuthenticated, getAuthUser, signInWithGoogle, signOutUser } from './config.js';
import { fetchQuestions } from './api.js';
import * as UI from './ui-renderer.js';
import { checkAccess, isAccessGranted } from './auth-paywall.js';

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
 * This function now explicitly checks that the topic is 'motion'.
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

    console.log(`[ENGINE] Parsed Params: Topic='${quizState.topicSlug}', Difficulty='${quizState.difficulty}'`);
    
    // Set initial titles using the safe renderTitles function
    UI.renderTitles(quizState.topicSlug, quizState.difficulty);
    
    // If essential parameters are missing, display an error and halt
    if (!quizState.topicSlug || !quizState.difficulty) {
        UI.updateStatus(`
            <span class="text-red-500">Error: Missing Quiz Parameters.</span> 
            Please ensure the URL contains 'topic' and 'difficulty' slugs.
        `);
        throw new Error("Missing essential URL parameters (topic or difficulty).");
    }
}

/**
 * Loads the quiz data and updates the UI.
 */
async function loadQuiz() {
    UI.updateStatus("Loading quiz data...");
    try {
        // fetchQuestions now correctly uses quizState.topicSlug (which is 'motion') as the table name
        const questions = await fetchQuestions(quizState.topicSlug, quizState.difficulty);
        quizState.questions = questions;
        quizState.userAnswers = {}; // Reset answers for a new quiz
        quizState.isSubmitted = false;
        quizState.score = 0;
        
        UI.renderTitles(quizState.topicSlug, quizState.difficulty, quizState.questions.length);
        
        // Show the first question
        navigateToQuestion(0);
        UI.showView('quiz-content');
    } catch (error) {
        // Display a detailed error to the user if the fetch failed (e.g., table missing)
        console.error("[ENGINE] Failed to load quiz:", error);
        UI.updateStatus(`<span class="text-red-500">Failed to load quiz:</span> ${error.message}`);
    }
}

// --- Navigation and Rendering ---

function navigateToQuestion(index) {
    if (index >= 0 && index < quizState.questions.length) {
        quizState.currentQuestionIndex = index;
        const currentQ = quizState.questions[index];
        const userAnswer = quizState.userAnswers[currentQ.id] || null;
        
        UI.renderQuestion(currentQ, index, userAnswer, quizState.isSubmitted);
        
        // Update navigation controls
        const elements = UI.getElements();
        const prevButton = document.getElementById('prev-button');
        const nextButton = document.getElementById('next-button');
        
        if (prevButton) prevButton.disabled = index === 0;
        if (nextButton) nextButton.disabled = index === quizState.questions.length - 1;

        // Update question counter display (assuming you have one, e.g., an element with ID 'question-counter')
        const counter = document.getElementById('question-counter');
        if (counter) {
             counter.textContent = `${index + 1} / ${quizState.questions.length}`;
        }
        
        // Toggle submit button visibility
        if (elements.submitButton) elements.submitButton.classList.toggle('hidden', index !== quizState.questions.length - 1 || quizState.isSubmitted);

    }
}

function handleNavigation(direction) {
    let newIndex = quizState.currentQuestionIndex + direction;
    
    // Save the current question's answer before navigating away
    saveCurrentAnswer();
    
    navigateToQuestion(newIndex);
}

function saveCurrentAnswer() {
    const currentQ = quizState.questions[quizState.currentQuestionIndex];
    if (!currentQ) return;
    
    const elements = UI.getElements();
    const currentQuestionContainer = elements.questionList.querySelector('#question-content-display');
    if (!currentQuestionContainer) return;
    
    // Find the checked radio button
    const checkedRadio = currentQuestionContainer.querySelector(`input[name="question-${quizState.currentQuestionIndex}"]:checked`);
    
    if (checkedRadio) {
        quizState.userAnswers[currentQ.id] = checkedRadio.value;
    } else {
        // If user unchecks or leaves blank, ensure previous answer is cleared
        delete quizState.userAnswers[currentQ.id];
    }
    console.log(`[ENGINE] Answer saved for Q${quizState.currentQuestionIndex + 1}:`, quizState.userAnswers[currentQ.id]);
}

// --- Submission and Scoring ---

function handleSubmit() {
    // 1. Ensure the answer for the final question is saved
    saveCurrentAnswer();
    
    // 2. Check if all questions are answered
    if (Object.keys(quizState.userAnswers).length !== quizState.questions.length) {
        UI.updateStatus(`
            <span class="text-yellow-600">Please answer all questions before submitting.</span> 
            <button onclick="quizEngine.clearStatus()" class="ml-4 text-blue-500 underline">Dismiss</button>
        `);
        return;
    }
    
    // 3. Score the quiz
    let correctCount = 0;
    quizState.questions.forEach(q => {
        const userAnswer = quizState.userAnswers[q.id];
        if (userAnswer && userAnswer === q.correct_answer) {
            correctCount++;
        }
    });
    
    quizState.score = correctCount;
    quizState.isSubmitted = true;
    
    // 4. Send results to API (optional but good practice)
    const resultPayload = {
        topic: quizState.topicSlug,
        difficulty: quizState.difficulty,
        score: correctCount,
        total: quizState.questions.length,
        answers: quizState.userAnswers,
        userId: getAuthUser() ? getAuthUser().uid : 'anonymous'
    };
    
    // Placeholder for API call
    // saveResult(resultPayload).then(() => console.log("Result saved.")).catch(e => console.error("Save error:", e));

    // 5. Navigate to the results screen and update the UI
    UI.updateResultDisplay(quizState.score, quizState.questions.length);
    UI.showView('results-screen');
    
    // Optional: Re-render the current question (the last one) to show feedback
    navigateToQuestion(quizState.currentQuestionIndex); 
}

// --- Authentication and Paywall Flow ---

async function handleAuthChange(user) {
    UI.updateAuthUI(user);
    UI.hideStatus(); 
    
    // NOTE: checkAccess is a placeholder, assuming it will allow access for 'motion' if the user is logged in/paid.
    const accessGranted = await checkAccess(quizState.topicSlug, user);
    
    if (accessGranted) {
        console.log("[ACCESS] Granted. Loading quiz.");
        // Only load the quiz if the required parameters were successfully parsed
        if (quizState.topicSlug && quizState.difficulty) {
             await loadQuiz();
        } else {
             UI.updateStatus("Authentication successful, but quiz details are missing from URL.");
        }
    } else {
        console.log("[ACCESS] Denied. Showing paywall.");
        UI.updatePaywallContent(quizState.topicSlug);
        UI.showView('paywall-screen');
    }
}

async function handleSignIn() {
    UI.updateStatus("Signing in with Google...");
    try {
        await signInWithGoogle();
    } catch (error) {
        UI.updateStatus("Sign-in failed. See console for details.");
        console.error("Sign-in error:", error);
    }
}

async function handleSignOut() {
    UI.updateStatus("Signing out...");
    try {
        await signOutUser();
        // After sign out, the onAuthStateChanged listener will trigger handleAuthChange(null)
    } catch (error) {
        UI.updateStatus("Sign-out failed. See console for details.");
        console.error("Sign-out error:", error);
    }
}

// --- Setup and Events ---

async function initQuizEngine() {
    UI.updateStatus("Initializing services and checking authentication...");
    
    try {
        // 1. Parse URL immediately to get topic/difficulty
        // This function will throw an error if the topic is not 'motion' or parameters are missing
        parseUrlParameters();

        // 2. Initialize Firebase/Supabase/etc., and attach auth listener
        await initServices(handleAuthChange); 
        
        // 3. Get DOM elements for event listeners
        const elements = UI.getElements();

        // 4. Attach Event Listeners
        // Navigation buttons
        const prevButton = document.getElementById('prev-button');
        const nextButton = document.getElementById('next-button');

        if (prevButton) prevButton.addEventListener('click', () => handleNavigation(-1));
        if (nextButton) nextButton.addEventListener('click', () => handleNavigation(1));
        
        // Submit button
        if (elements.submitButton) elements.submitButton.addEventListener('click', handleSubmit);
        
        // Auth buttons
        if (elements.loginButton) elements.loginButton.addEventListener('click', handleSignIn);
        if (elements.logoutNavBtn) elements.logoutNavBtn.addEventListener('click', handleSignOut);
        
    } catch (error) {
        console.error("[ENGINE FATAL] Initialization failed:", error);
        // Display the error thrown by parseUrlParameters or initServices
        UI.updateStatus(`
            <span class="text-red-600">CRITICAL ERROR: Initialization Failed.</span> 
            <p class="mt-2">Reason: ${error.message}</p>
        `);
    }
}

// Expose public methods for use in HTML (like the dismiss button)
window.quizEngine = {
    handleSignIn,
    handleSignOut,
    clearStatus: UI.hideStatus,
    // Add loadQuiz for potential reloads if needed
    loadQuiz: loadQuiz 
};

// Start the engine once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initQuizEngine);
