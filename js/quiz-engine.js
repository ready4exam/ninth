// js/quiz-engine.js
import { initServices, getAuthUser } from './config.js';
import { fetchQuestions, saveResult } from './api.js';
import * as UI from './ui-renderer.js';
import { initializeAuthListener, checkAccess, signInWithGoogle, signOut } from './auth-paywall.js'; 
import { cleanKatexMarkers, capitalizeFirstLetter } from './utils.js'; // NEW: Import from utils

// --- Global State ---
let quizState = {
    // Parsed from URL
    classId: null,
    subject: null,
    subSubject: null, // NEW: Added subSubject
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
    quizState.subSubject = urlParams.get('sub_subject'); // NEW: Capture optional sub_subject
    quizState.topicSlug = urlParams.get('topic'); // e.g., 'motion'
    quizState.difficulty = urlParams.get('difficulty'); // e.g., 'simple' or 'medium'
    
    // Enforce the requirement: Must have class, subject, topic, and difficulty
    if (!quizState.classId || !quizState.subject || !quizState.topicSlug || !quizState.difficulty) {
         UI.updateStatus(`
            <span class="text-red-500">Error: Missing Parameters.</span> 
            <p class="mt-2">Ensure class, subject, topic, and difficulty are provided in the URL.</p>
        `);
        throw new Error("Quiz URL parameters missing.");
    }
}

/**
 * Loads the quiz data from the API and renders the first question.
 */
async function loadQuiz() {
    UI.updateStatus(`<p class="text-lg font-semibold text-cbse-blue">Loading quiz for topic: ${quizState.topicSlug}...</p>`);

    try {
        const questions = await fetchQuestions(quizState.topicSlug, quizState.difficulty);
        quizState.questions = questions;

        if (questions.length === 0) {
            UI.updateStatus(`
                <span class="text-red-500">Error: No Questions Found.</span> 
                <p class="mt-2">Could not retrieve questions for the selected topic/difficulty.</p>
            `);
            return;
        }

        // Apply Katex cleaning to all question content once after fetch (for saveResult)
        // Also, create a clean title for the UI
        let cleanTitle = quizState.topicSlug.replace(/_/g, ' ');
        if (quizState.subSubject) {
            cleanTitle = `${quizState.subject.replace(/_/g, ' ')} / ${quizState.subSubject.replace(/_/g, ' ')}: ${cleanTitle}`;
        } else {
             cleanTitle = `${quizState.subject.replace(/_/g, ' ')}: ${cleanTitle}`;
        }
        
        UI.updateQuizMetadata(cleanKatexMarkers(cleanTitle), quizState.difficulty);

        renderQuestion(quizState.currentQuestionIndex);
        UI.updateQuestionNumber(quizState.currentQuestionIndex + 1, quizState.questions.length);
        UI.hideStatus();
        
        // Show/Hide submit button based on question count
        const elements = UI.getElements();
        if (elements.submitButton) {
            elements.submitButton.classList.remove('hidden');
        }

    } catch (error) {
        console.error("[ENGINE ERROR] Failed to load quiz:", error);
        UI.updateStatus(`
            <span class="text-red-500">CRITICAL ERROR: Quiz Load Failed.</span> 
            <p class="mt-2">Reason: ${error.message}</p>
        `);
    }
}

/**
 * Renders the question at the specified index.
 * @param {number} index - The index of the question to render.
 */
function renderQuestion(index) {
    if (index < 0 || index >= quizState.questions.length) return;
    
    const elements = UI.getElements();
    const questionContainer = elements.questionList;
    const prevButton = document.getElementById('prev-btn');
    const nextButton = document.getElementById('next-btn');

    // 1. Clear current question
    questionContainer.innerHTML = ''; 

    // 2. Build and append new question card
    const question = quizState.questions[index];
    const userAnswer = quizState.userAnswers[question.id] || null;
    const card = UI.createQuestionCard(question, index, userAnswer, quizState.isSubmitted);
    questionContainer.appendChild(card);
    
    // 3. Attach event listener for option selection
    if (!quizState.isSubmitted) {
        card.querySelectorAll('input[type="radio"]').forEach(input => {
            input.addEventListener('change', (e) => handleAnswerSelection(question.id, e.target.dataset.optionId));
        });
    }

    // 4. Update navigation state
    quizState.currentQuestionIndex = index;
    prevButton.disabled = index === 0;
    nextButton.disabled = index === quizState.questions.length - 1;
    
    // Show/Hide submit button
    if (elements.submitButton) {
        if (index === quizState.questions.length - 1 && !quizState.isSubmitted) {
             elements.submitButton.classList.remove('hidden');
        } else {
             elements.submitButton.classList.add('hidden');
        }
    }

    UI.updateQuestionNumber(index + 1, quizState.questions.length);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Stores the user's selected answer in the state.
 * @param {string} questionId - The ID of the question.
 * @param {string} optionId - The ID of the selected option.
 */
function handleAnswerSelection(questionId, optionId) {
    quizState.userAnswers[questionId] = {
        selectedOption: optionId,
        questionIndex: quizState.currentQuestionIndex // Store index for easy review
    };
    
    // Automatically move to the next question if available
    if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
        setTimeout(() => handleNavigation(1), 300); // 300ms delay for visual feedback
    }
    console.log(`Answer stored for QID ${questionId}: ${optionId}`);
}

/**
 * Handles navigation between questions.
 * @param {1|-1} direction - 1 for next, -1 for previous.
 */
function handleNavigation(direction) {
    const newIndex = quizState.currentQuestionIndex + direction;
    if (newIndex >= 0 && newIndex < quizState.questions.length) {
        renderQuestion(newIndex);
    }
}

/**
 * Calculates the score and submits the quiz.
 */
async function handleSubmit() {
    if (quizState.isSubmitted) return;
    
    if (Object.keys(quizState.userAnswers).length < quizState.questions.length) {
        if (!confirm("You have not answered all questions. Do you want to submit anyway?")) {
            return;
        }
    }

    quizState.isSubmitted = true;
    let correctCount = 0;

    quizState.questions.forEach(q => {
        const userAnswer = quizState.userAnswers[q.id];
        if (userAnswer && userAnswer.selectedOption === q.correct_option_id) {
            correctCount++;
        }
    });

    quizState.score = correctCount;
    
    // Render the current question in review mode
    renderQuestion(quizState.currentQuestionIndex); 
    
    // Update score display and switch view
    UI.updateScoreDisplay(quizState.score, quizState.questions.length);
    
    // Hide submit button permanently
    const elements = UI.getElements();
    if (elements.submitButton) elements.submitButton.classList.add('hidden');


    // --- Save Result to Firestore ---
    const user = getAuthUser();
    if (user && !user.isAnonymous) {
        const resultData = {
            class_id: quizState.classId,
            subject: quizState.subject,
            sub_subject: quizState.subSubject, // NEW: Include subSubject
            topic_slug: quizState.topicSlug,
            difficulty: quizState.difficulty,
            score: quizState.score,
            total_questions: quizState.questions.length,
            answers: quizState.userAnswers, // Store user answers
            // Include a sample of questions for context if needed (e.g., QID, type)
            questions_summary: quizState.questions.map(q => ({ 
                id: q.id, 
                type: q.question_type, 
                order: q.question_order 
            })), 
        };
        await saveResult(resultData);
    } else {
        console.warn("[ENGINE] Quiz result not saved. User not authenticated.");
    }
}

/**
 * Main handler when Firebase Auth state changes.
 * @param {Object|null} user - The authenticated user.
 */
async function onAuthChange(user) {
    console.log(`[AUTH] State changed. User ID: ${user ? (user.isAnonymous ? 'anonymous' : user.uid) : 'null'}`);
    
    const hasAccess = await checkAccess(quizState.topicSlug); 

    if (hasAccess) {
        console.log("[ACCESS] Granted. Starting quiz load.");
        if (quizState.questions.length === 0) {
             await loadQuiz(); // Load quiz only if it hasn't been loaded yet
        } else {
             UI.switchView('quiz-content'); // Switch back to quiz content
        }
    } else {
        console.log("[ACCESS] Denied. Showing paywall/login prompt.");
        UI.updatePaywallContent(quizState.topicSlug);
        UI.switchView('paywall-screen');
    }
}

/**
 * Initial setup for the quiz engine.
 */
async function initQuizEngine() {
    try {
        // 1. Parse URL parameters and validate
        parseUrlParameters();
        
        // 2. Initialize all core services (Firebase/Supabase)
        await initServices();
        
        // 3. Initialize Auth listener with the main callback
        initializeAuthListener(onAuthChange); 
        
        // 4. Attach general listeners
        const elements = UI.getElements();
        const prevButton = document.getElementById('prev-btn');
        const nextButton = document.getElementById('next-btn');
        const reviewCompleteBtn = document.getElementById('review-complete-btn'); // For results screen

        if (prevButton) prevButton.addEventListener('click', () => handleNavigation(-1));
        if (nextButton) nextButton.addEventListener('click', () => handleNavigation(1));
        if (reviewCompleteBtn) reviewCompleteBtn.addEventListener('click', () => {
             // Redirect back to chapter selection for the same subject/class
             let url = `chapter-selection.html?class=${quizState.classId}&subject=${quizState.subject}`;
             if (quizState.subSubject) {
                 url += `&sub_subject=${quizState.subSubject}`;
             }
             window.location.href = url;
        });
        
        // Submit button
        if (elements.submitButton) elements.submitButton.addEventListener('click', handleSubmit);
        
        // Auth buttons
        if (elements.loginButton) elements.loginButton.addEventListener('click', handleSignIn);
        // Auth button on paywall screen
        const paywallAuthBtn = document.getElementById('auth-paywall-btn');
        if (paywallAuthBtn) paywallAuthBtn.addEventListener('click', handleSignIn); 
        
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

// Expose public methods for use in HTML
window.quizEngine = {
    handleSignIn: signInWithGoogle, // Exported from auth-paywall.js
    handleSignOut: signOut, // Exported from auth-paywall.js
    clearStatus: UI.hideStatus,
    loadQuiz: loadQuiz 
};

// Start the engine once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initQuizEngine);
