// js/ui-renderer.js
import { cleanKatexMarkers } from './utils.js';

let els = {};
let isInit = false;

export function initializeElements() {
  if (isInit) return;
  els = {
    title: document.getElementById('quiz-page-title'),
    diffBadge: document.getElementById('difficulty-display'),
    status: document.getElementById('status-message'),
    list: document.getElementById('question-list'),
    counter: document.getElementById('question-counter'),
    prevButton: document.getElementById('prev-btn'),
    nextButton: document.getElementById('next-btn'),
    submitButton: document.getElementById('submit-btn'),
    reviewScreen: document.getElementById('results-screen'),
    score: document.getElementById('score-display'),
    reviewCompleteBtn: document.getElementById('review-complete-btn'),
    authNav: document.getElementById('auth-nav-container'),
    paywallScreen: document.getElementById('paywall-screen'),
    paywallContent: document.getElementById('paywall-content'),
    quizContent: document.getElementById('quiz-content'),
  };
  isInit = true;
  console.log('[UI] Elements initialized.');
}
export function getElements() { if (!isInit) initializeElements(); return els; }

export function showStatus(msg, cls='text-gray-700') {
  initializeElements();
  els.status.innerHTML = msg;
  els.status.className = `p-3 text-center ${cls}`;
  els.status.classList.remove('hidden');
}
export function hideStatus(){ if(els.status) els.status.classList.add('hidden'); }

export function updateHeader(topic, diff){
  initializeElements();
  els.title.textContent = `${topic.replace(/_/g,' ').toUpperCase()} Quiz`;
  els.diffBadge.textContent = `Difficulty: ${diff}`;
}

export function showView(view){
  initializeElements();
  [els.quizContent, els.reviewScreen, els.paywallScreen].forEach(v=>v?.classList.add('hidden'));
  if(view==='quiz-content') els.quizContent.classList.remove('hidden');
  if(view==='results-screen') els.reviewScreen.classList.remove('hidden');
  if(view==='paywall-screen') els.paywallScreen.classList.remove('hidden');
}

export function renderQuestion(q, idx, selected, submitted){
  initializeElements();
  const isAR = ['ar','case'].includes(q.question_type);
  const qText = cleanKatexMarkers(q.text);
  const reason = cleanKatexMarkers(q.scenario_reason||'');

  const opts = ['A','B','C','D'].map(opt=>{
    const txt = cleanKatexMarkers(q.options[opt]);
    const sel = selected===opt;
    const correct = submitted && q.correct_answer===opt;
    const wrong = submitted && sel && !correct;
    let cls='option-label block border-2 rounded p-3 mb-2 cursor-pointer';
    if(correct) cls+=' border-green-600 bg-green-50';
    else if(wrong) cls+=' border-red-600 bg-red-50';
    else if(sel) cls+=' border-blue-500 bg-blue-50';
    return `<label><input type="radio" name="q-${q.id}" value="${opt}" class="hidden" ${sel?'checked':''} ${submitted?'disabled':''}>
            <div class="${cls}"><b>${opt}.</b> ${txt}</div></label>`;
  }).join('');

  els.list.innerHTML = `
    <div>
      <p class="text-lg font-bold text-gray-800">Q${idx}: ${qText}</p>
      ${isAR && reason && !submitted?`<p class="italic text-gray-700 mt-2 border-l-4 border-blue-400 pl-3">Reason (R): ${reason}</p>`:''}
      <div class="mt-4">${opts}</div>
      ${submitted && isAR && reason?`<div class="mt-4 p-3 bg-blue-50 rounded"><b>Explanation:</b> ${reason}</div>`:''}
    </div>`;
  if(els.counter) els.counter.textContent=`${idx} / ${els._total||'--'}`;
}

export function attachAnswerListeners(fn){
  initializeElements();
  els.list.addEventListener('change',e=>{
    if(e.target.type==='radio') fn(e.target.name.slice(2), e.target.value);
  });
}

export function updateNavigation(i,total,submitted){
  initializeElements();
  els._total=total;
  els.prevButton.classList.toggle('hidden', i===0);
  els.nextButton.classList.toggle('hidden', i>=total-1);
  els.submitButton.classList.toggle('hidden', submitted||i<total-1);
  els.reviewCompleteBtn.classList.toggle('hidden', !submitted);
  if(els.counter) els.counter.textContent=`${i+1} / ${total}`;
}

export function showResults(score,total){
  initializeElements();
  els.score.textContent=`${score} / ${total}`;
  showView('results-screen');
}

export function renderAllQuestionsForReview(qs,userAnswers={}){
  initializeElements();
  els.list.innerHTML=qs.map((q,i)=>{
    const txt=cleanKatexMarkers(q.text);
    const r=cleanKatexMarkers(q.scenario_reason||'');
    const ua=userAnswers[q.id]||'-';
    const ca=q.correct_answer||'-';
    const ok=ua===ca;
    return `<div class="mb-5 p-4 bg-gray-50 rounded border">
      <p class="font-bold text-lg">Q${i+1}: ${txt}</p>
      ${r?`<p class="italic text-gray-600 mb-2">Reason: ${r}</p>`:''}
      <p>Your Answer: <span class="${ok?'text-green-600':'text-red-600'} font-semibold">${ua}</span></p>
      <p>Correct Answer: <b class="text-green-700">${ca}</b></p>
    </div>`;
  }).join('');
  showView('results-screen');
}

export function updateAuthUI(user){
  initializeElements();
  els.authNav.innerHTML=user?
    `<span class="text-white text-sm mr-2">Hi, ${(user.displayName||user.email||'User').split('@')[0]}</span>
     <button id="logout-nav-btn" class="px-4 py-2 bg-red-500 text-white rounded">Sign Out</button>`:
    `<button id="login-btn" class="px-4 py-2 bg-white text-cbse-blue rounded">Sign In</button>`;
}

export function updatePaywallContent(topic){
  initializeElements();
  els.paywallContent.innerHTML=`<div class="p-6 bg-yellow-50 border-l-4 border-yellow-600 rounded">
    <h2 class="text-xl font-bold mb-2">Access Restricted</h2>
    <p>This quiz on <b>${topic.toUpperCase()}</b> is for signed-in users only.</p>
    <button id="paywall-login-btn" class="mt-4 px-6 py-2 bg-green-600 text-white rounded">Sign In to Unlock</button>
  </div>`;
}
