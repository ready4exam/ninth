import { fetchQuestions } from './api.js'; // CORRECTED PATH: Use './api.js' assuming both files are in the same folder

// --- Placeholder/Stubbed Imports for Missing Modules (Assumes all are in the same 'js' folder) ---
const initializeAuthListener = () => { console.log('Auth initialized.'); };
const signInWithGoogle = () => {};
const signOut = () => {};
const checkPaymentStatus = () => true; 
const countQuestions = () => 20;
const saveResult = (result) => { console.log("Saving quiz result:", result); }; 

// --- UI Helper Functions (Basic DOM manipulation for status and visibility) ---
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
    // This is a placeholder. In a complete app, this would render the question and options dynamically.
    console.log(`Rendering Question #${currentQ + 1} of ${data.length}`);
};


// --- Global Constants ---
const BRAND_NAME = "Ready4Industry";
const BRAND_TAGLINE = "Ready4Exam: Master the subject, own your confidence, and pass any school exam with flying colors. Prepare for Ready4Industry success."; 
// Regex to strip LaTeX/KaTeX delimiters (e.g., $formula$ or $$formula$$)
const STRIP_LATEX_REGEX = /(\$\$?)(.*?)\1/g; 

// --- State Variables ---
let currentQuiz = {
    class: '',
    subject: '',
    topic: '',
    difficulty: '',
    questions: [], // Stores the fetched and TRANSFORMED question data
    userAnswers: [],
};
let currentQuestionIndex = 0;


// --- Branding Initialization ---
function initBranding() {
    const nameEl = document.getElementById('brand-name-display');
    const taglineEl = document.getElementById('brand-tagline-display');
    
    if (nameEl) {
        nameEl.textContent = BRAND_NAME;
    }
    if (taglineEl) {
        taglineEl.textContent = BRAND_TAGLINE;
    }
}

// --- Data Transformation & Cleanup ---

/**
 * Applies all data cleanup rules to a single raw question object.
 */
function transformQuestion(q) {
    const answerKeyToIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
    
    let scenarioText = q.scenario_reason_text || '';
    
    // Function to strip LaTeX symbols
    const stripLatex = (text) => text ? text.replace(STRIP_LATEX_REGEX, (match, p1, p2) => p2 || match) : '';

    // 1. Sanitize scenario_reason_text based on question_type
    switch (q.question_type) {
        case 'mcq':
            // Rule 1: For MCQs, scenario_reason_text must be empty
            scenarioText = ''; 
            break;
        case 'assertion_reasoning':
            // Rule 2: scenario_reason_text holds the Reasoning
            break;
        case 'case_study':
            // Rule 3: scenario_reason_text holds the Scenario
            break;
    }

    // Transform and clean fields
    return {
        id: q.id,
        text: stripLatex(q.question_text),
        type: q.question_type, 
        options: [
            stripLatex(q.option_a), 
            stripLatex(q.option_b), 
            stripLatex(q.option_c), 
            stripLatex(q.option_d)
        ],
        scenarioText: stripLatex(scenarioText), // Cleaned scenario/reasoning text
        correct_answer_index: answerKeyToIdx[q.correct_answer_key.toUpperCase()],
    };
}


// --- Quiz Loading Function ---

async function loadQuiz() {
    const { topic, difficulty } = currentQuiz;
    
    // Generic user-facing loading message
    updateStatus(`Preparing your quiz on ${topic.replace(/_/g, ' ')}...`);
    
    try {
        // 1. Fetch raw data from API (in api.js)
        const rawQuestions = await fetchQuestions(topic, difficulty);

        if (rawQuestions.length === 0) {
            throw new Error("We couldn't find any questions for this topic. Please check the link or try another section.");
        }

        // 2. Transform and clean the data
        currentQuiz.questions = rawQuestions.map(transformQuestion);
        currentQuiz.userAnswers = new Array(currentQuiz.questions.length).fill(null);
        
        // 3. Update UI and start quiz
        const titleText = currentQuiz.topic.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        renderTitles(titleText); 
        
        // Initial render of the first question
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
    initializeAuthListener(); 
    
    // 4. Check Payment/Subscription status
    if (!checkPaymentStatus()) {
        updateStatus("Access Denied: Please subscribe to view quizzes.");
        return; 
    }

    // 5. Load the Quiz Data
    await loadQuiz();
    
    // --- Event Listeners (Placeholder) ---
    // Example navigation listeners
    document.getElementById('prev-btn')?.addEventListener('click', () => { /* Logic for previous question */ });
    document.getElementById('next-btn')?.addEventListener('click', () => { /* Logic for next question */ });
});
