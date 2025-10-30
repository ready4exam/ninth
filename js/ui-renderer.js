// js/ui-renderer.js
import { cleanKatexMarkers } from './utils.js';

let elements = {};
let isInitialized = false;

export function initializeElements() {
    if (isInitialized) return;
    elements = {
        mainContainer: document.getElementById('main-container'),
        quizTitle: document.getElementById('quiz-header-topic'),
        statusMessage: document.getElementById('status-message'),
        questionList: document.getElementById('question-list'),
        scoreDisplay: document.getElementById('score-display'),
        submitButton: document.getElementById('submit-btn'),
        reviewContainer: document.getElementById('review-container'),
    };
    isInitialized = true;
    console.log('[UI RENDERER] Elements initialized.');
}

export function showStatus(message) {
    initializeElements();
    if (elements.statusMessage) {
        elements.statusMessage.innerHTML = message;
        elements.statusMessage.classList.remove('hidden');
    }
}

export function hideStatus() {
    if (elements.statusMessage) elements.statusMessage.classList.add('hidden');
}

/**
 * Renders a single question.
 * Only shows explanations after quiz is submitted.
 */
export function renderQuestion(question, questionNumber, selectedAnswer, isSubmitted) {
    initializeElements();
    if (!elements.questionList) return;

    const isARorCase = ['ar', 'case'].includes(question.question_type);
    const qText = cleanKatexMarkers(question.text);
    const rText = cleanKatexMarkers(question.scenario_reason);
    const explanationText = cleanKatexMarkers(question.explanation || '');

    elements.questionList.innerHTML = `
        <div class="space-y-6">
            <p class="text-xl font-bold text-heading">Q${questionNumber}: ${qText}</p>
            ${isARorCase && rText
                ? `<p class="italic text-gray-700 border-l-4 border-blue-300 pl-4">${rText}</p>`
                : ''
            }
            <div id="options-container" class="space-y-3">
                ${['A','B','C','D'].map(opt => {
                    const optText = cleanKatexMarkers(question.options[opt] || '');
                    const isSel = selectedAnswer === opt;
                    const isCorrect = isSubmitted && opt === question.correct_answer;
                    const isIncorrect = isSubmitted && isSel && !isCorrect;

                    let cls = 'option-label';
                    if (isCorrect) cls += ' border-green-600 bg-green-100';
                    else if (isIncorrect) cls += ' border-red-600 bg-red-100';
                    else if (isSel) cls += ' border-blue-500 bg-blue-50 shadow-md';

                    return `
                        <label>
                            <input type="radio" name="q-${question.id}" value="${opt}" class="hidden"
                                   ${isSel ? 'checked' : ''} ${isSubmitted ? 'disabled' : ''}>
                            <div class="${cls} p-3 rounded-lg border cursor-pointer flex items-start gap-2">
                                <span class="font-bold">${opt}.</span>
                                <p>${optText}</p>
                            </div>
                        </label>`;
                }).join('')}
            </div>

            ${isSubmitted && isARorCase && explanationText
                ? `<div class="mt-4 p-3 border-l-4 border-blue-500 bg-blue-50 rounded-lg">
                     <p class="text-sm"><strong>Explanation:</strong> ${explanationText}</p>
                   </div>`
                : ''
            }
        </div>
    `;
}

/**
 * After submission — render all correct answers in one view.
 */
export function renderAllQuestionsForReview(questions) {
    initializeElements();
    if (!elements.reviewContainer) return;
    elements.reviewContainer.innerHTML = questions.map((q, i) => `
        <div class="mb-6 p-4 bg-gray-50 rounded-lg shadow">
            <p class="font-bold text-lg mb-2">Q${i + 1}: ${cleanKatexMarkers(q.text)}</p>
            ${q.scenario_reason
                ? `<p class="italic text-gray-600 mb-2">${cleanKatexMarkers(q.scenario_reason)}</p>`
                : ''
            }
            <p class="text-green-700 font-semibold">
                Correct Answer: ${q.correct_answer}
            </p>
        </div>
    `).join('');
    elements.reviewContainer.classList.remove('hidden');
}
