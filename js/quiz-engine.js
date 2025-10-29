import { fetchQuestions, countQuestions, saveResult } from './api.js'; // Correct path: './api.js'

// --- Imports for Missing Modules (Assumes all are in the same 'js' folder) ---
// These functions are now imported from their dedicated files, not stubbed here.
import { initializeAuthListener, signInWithGoogle, signOut, checkPaymentStatus } from './auth-paywall.js';
// Note: countQuestions and saveResult are already imported from api.js above.

// --- UI Helper Functions (Basic DOM manipulation for status and visibility) ---
// These functions usually come from ui-renderer.js, but we'll keep the stubs here for now
// to avoid introducing another file dependency unless explicitly requested.
const showView = (id) => { 
    console.log(`Showing view: ${id}`); 
    document.getElementById('loading-status').classList.add('hidden'); 
    document.getElementById(id)?.classList.remove('hidden');
};
const updateStatus = (msg) => { 
    // Uses generic status messages, avoiding mention of Supabase/Firestore
    const el = document.getElementById('loading-status');
    if (el) {
        el.textContent = msg;
        el.classList.remove('hidden');
    }
};
const hideStatus = () => { 
    document.getElementById('loading-status')?.classList.add('hidden');
};
const renderTitles = (title) => { 
    const el = document.getElementById('quiz-title'); 
    if(el) el.textContent = title; 
};
const renderQuestionOrResult = (data, userAnswers, currentQ) => { 
    // This is a placeholder. In a full implementation, this function would render the question UI
    console.log("Rendering question/result UI placeholder...");
};

// Placeholder for branding initialization
const initBranding = () => {
    // Logic to set the brand name/tagline in the header
    document.getElementById('brand-name-display').textContent = 'Ready4Exam';
    document.getElementById('brand-tagline-display').textContent = 'Master Your CBSE Exams';
};

// Global state for the current quiz
const currentQuiz = {
    class: '',
    subject: '',
    topic: '',
    difficulty: 'medium',
    questions: [],
    userAnswers: {}, // To store answers like { 'q01': 'Option A', ... }
    isSubmitted: false,
};

let currentQuestionIndex = 0; // Tracks the current question being viewed


/**
 * Core function to load quiz data and transition the view.
 */
async function loadQuiz() {
    if (!currentQuiz.topic) {
        updateStatus("Error: Topic not specified in URL. Cannot load quiz.");
        return;
    }
    
    updateStatus(`Loading quiz for ${currentQuiz.topic} (${currentQuiz.difficulty})...`);
    renderTitles(currentQuiz.topic.toUpperCase()); // Set the header title
    
    try {
        // Fetch and shuffle questions
        currentQuiz.questions = await fetchQuestions(currentQuiz.topic, currentQuiz.difficulty);

        // Render the first question (or the entire quiz structure)
        renderQuestionOrResult(currentQuiz.questions, currentQuiz.userAnswers, currentQuestionIndex);
        
        showView('quiz-view');
        hideStatus();

    } catch (error) {
        console.error("Quiz Initialization Failed:", error);
        // Generic user-facing failure message
        updateStatus(`Failed to load quiz content. Please try refreshing or check your internet connection. (${error.message})`);
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

    // 2. Display Branding and Tagline immediately
    initBranding(); 
    
    // 3. Initialize Auth
    // NOTE: Auth listener is still initialized, but we won't block based on payment yet.
    initializeAuthListener(); 
    
    // 4. Check Payment/Subscription status
    // *** PAYWALL PAUSED: We are commenting out the payment check to allow access for development. ***
    /*
    if (!checkPaymentStatus()) {
        updateStatus("Access Denied: Please subscribe to view quizzes.");
        return; 
    }
    */

    // 5. Load the Quiz Data
    await loadQuiz();
    
    // --- Event Listeners (Placeholder) ---
    // Example navigation listeners
    document.getElementById('prev-btn')?.addEventListener('click', () => { /* Logic for previous question */ });
    document.getElementById('next-btn')?.addEventListener('click', () => { /* Logic for next question */ });
});
