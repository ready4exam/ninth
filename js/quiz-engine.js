<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Select Chapter & Difficulty</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            serif: ['Merriweather', 'serif'],
          },
          colors: {
            'cbse-blue': '#1a3e6a',
            'cbse-light': '#f5f7fa',
            'accent-gold': '#ffb703',
            'heading': '#0f172a',
          }
        }
      }
    };
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
    body { font-family: 'Inter', sans-serif; }
    .cbse-blue { background-color: #1a3e6a; }
    .cbse-light { background-color: #f5f7fa; }
    .topic-btn {
      @apply flex items-center justify-between p-4 bg-white border border-gray-300 rounded-lg shadow-sm cursor-pointer hover:bg-cbse-light transition-all duration-200;
    }
    .topic-btn.selected {
      @apply border-cbse-blue bg-blue-50/50 shadow-md;
    }
    .difficulty-btn {
      @apply px-5 py-3 rounded-xl font-semibold transition-colors duration-200 border-2;
    }
    .difficulty-btn.selected {
      @apply ring-4 ring-cbse-blue/50;
    }
    .sub-subject-btn.selected {
      @apply border-4 border-cbse-blue ring-2 ring-cbse-blue/30;
    }
  </style>
</head>

<body class="bg-cbse-light min-h-screen flex flex-col">
  <!-- Header -->
  <header class="bg-cbse-blue shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
      <h1 class="text-2xl font-extrabold text-accent-gold tracking-wider">
        Ready4<span class="text-white">Exam</span> Portal
      </h1>
      <nav id="auth-nav-container">
        <button id="login-btn" class="px-4 py-2 text-sm font-semibold rounded-lg bg-white text-cbse-blue hover:bg-gray-100 transition">
          Sign In
        </button>
      </nav>
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="max-w-4xl mx-auto">
      <h2 id="page-title" class="text-3xl font-extrabold text-heading mb-6 text-center">
        Select Chapter & Difficulty
      </h2>

      <!-- Sub-subject selection -->
      <div id="subject-selection-container" class="space-y-6 mb-8">
        <h3 class="text-2xl font-bold text-gray-800 border-b pb-2">1. Select Sub-Subject (if applicable)</h3>
        <div id="sub-subject-list" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
      </div>

      <!-- Chapter selection -->
      <div id="chapter-selection-container" class="space-y-6 mb-8 hidden">
        <h3 class="text-2xl font-bold text-gray-800 border-b pb-2">2. Select a Chapter/Topic</h3>
        <div id="topic-list" class="grid grid-cols-1 gap-4"></div>
      </div>

      <!-- Difficulty selection -->
      <div id="difficulty-selection-container" class="space-y-6 mb-10 hidden">
        <h3 class="text-2xl font-bold text-gray-800 border-b pb-2">3. Select Quiz Difficulty</h3>

        <!-- Display selected chapter -->
        <p id="selected-chapter-display" class="text-center text-cbse-blue font-semibold mb-4 hidden"></p>

        <div id="difficulty-selection" class="flex flex-wrap justify-center gap-4">
          <button data-difficulty="simple" class="difficulty-btn bg-green-500 text-white hover:bg-green-600 border-green-500">
            Simple (Easy)
          </button>
          <button data-difficulty="medium" class="difficulty-btn bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500">
            Medium
          </button>
          <button data-difficulty="advanced" class="difficulty-btn bg-red-500 text-white hover:bg-red-600 border-red-500">
            Advanced (Hard)
          </button>
        </div>
      </div>

      <p id="error-message" class="text-red-500 font-semibold text-center hidden mb-6">
        Please select both a Topic and a Difficulty level to start the quiz.
      </p>

      <div class="text-center">
        <button id="start-quiz-btn" class="px-10 py-4 bg-cbse-blue text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-xl disabled:opacity-50" disabled>
          Start Quiz
        </button>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="bg-cbse-blue mt-16 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
      <small class="text-sm opacity-70 block mt-2">© 2025 Ready4Exam Academic Portal. All Rights Reserved.</small>
    </div>
  </footer>

  <script src="https://unpkg.com/lucide@latest"></script>

  <!-- Main Script -->
  <script type="module">
    import curriculumData from './js/curriculum.js';

    // --- DOM Elements ---
    const pageTitleEl = document.getElementById('page-title');
    const subSubjectListEl = document.getElementById('sub-subject-list');
    const chapterSelectionContainerEl = document.getElementById('chapter-selection-container');
    const topicListEl = document.getElementById('topic-list');
    const difficultySelectionContainerEl = document.getElementById('difficulty-selection-container');
    const difficultySelectionEl = document.getElementById('difficulty-selection');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const errorMessageEl = document.getElementById('error-message');
    const subjectSelectionContainerEl = document.getElementById('subject-selection-container');
    const selectedChapterDisplay = document.getElementById('selected-chapter-display');

    // --- Global State ---
    let selectedTopic = null;
    let selectedTopicTitle = null;
    let selectedDifficulty = null;
    let selectedSubSubject = null;
    let currentClass = '9';
    let currentSubject = '';

    // ----------------------------
    // Function Definitions
    // ----------------------------

    function handleTopicSelection(topicId, buttonElement) {
      selectedTopic = topicId;
      selectedTopicTitle = buttonElement.querySelector('span').textContent.trim();

      document.querySelectorAll('.topic-btn').forEach(btn => btn.classList.remove('selected'));
      buttonElement.classList.add('selected');

      selectedChapterDisplay.textContent = `Selected Chapter: ${selectedTopicTitle}`;
      selectedChapterDisplay.classList.remove('hidden');

      difficultySelectionContainerEl.classList.remove('hidden');
      if (selectedDifficulty) startQuizBtn.disabled = false;
      errorMessageEl.classList.add('hidden');
    }

    function handleDifficultySelection(difficulty, buttonElement) {
      selectedDifficulty = difficulty;

      difficultySelectionEl.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('selected', 'bg-cbse-blue', 'text-white', 'border-cbse-blue');
        const diff = btn.dataset.difficulty;
        btn.classList.add(`bg-${diff === 'simple' ? 'green' : diff === 'medium' ? 'yellow' : 'red'}-500`, 'text-white');
      });

      buttonElement.classList.add('selected', 'bg-cbse-blue', 'text-white', 'border-cbse-blue');

      if (selectedTopic) startQuizBtn.disabled = false;
      errorMessageEl.classList.add('hidden');
    }

    function handleSubSubjectSelection(subSubjectId, buttonElement) {
      selectedSubSubject = subSubjectId;
      document.querySelectorAll('.sub-subject-btn').forEach(btn => btn.classList.remove('selected'));
      buttonElement.classList.add('selected');

      renderChapters(currentClass, currentSubject, selectedSubSubject);

      subjectSelectionContainerEl.classList.add('hidden');
      chapterSelectionContainerEl.classList.remove('hidden');
      selectedTopic = null;
      selectedDifficulty = null;
      startQuizBtn.disabled = true;
      difficultySelectionContainerEl.classList.add('hidden');
      errorMessageEl.classList.add('hidden');
    }

    function renderSubSubjects(classId, subject) {
      subSubjectListEl.innerHTML = '';
      const subjectData = curriculumData[classId]?.[subject];

      if (subjectData && !Array.isArray(subjectData)) {
        const subSubjectNames = Object.keys(subjectData);
        subSubjectNames.forEach(name => {
          const card = document.createElement('div');
          card.className = 'sub-subject-btn card flex flex-col justify-between cursor-pointer hover:border-cbse-blue transition';
          card.innerHTML = `<h4 class="text-xl font-bold text-heading mb-2">${name.replace(/_/g, ' ')}</h4>`;
          card.addEventListener('click', e => handleSubSubjectSelection(name, e.currentTarget));
          subSubjectListEl.appendChild(card);
        });
        pageTitleEl.textContent = `${subject.replace(/_/g, ' ')} - Select Sub-Subject`;
        subjectSelectionContainerEl.classList.remove('hidden');
      } else if (Array.isArray(subjectData)) {
        selectedSubSubject = null;
        subjectSelectionContainerEl.classList.add('hidden');
        renderChapters(classId, subject, selectedSubSubject);
      } else {
        pageTitleEl.textContent = 'Error: Curriculum Not Found';
      }
    }

    function renderChapters(classId, subject, subSubject) {
      topicListEl.innerHTML = '';
      let chapters = subSubject ? curriculumData[classId]?.[subject]?.[subSubject] || [] : curriculumData[classId]?.[subject] || [];

      if (chapters.length > 0) {
        chapters.forEach(chapter => {
          const button = document.createElement('button');
          button.className = 'topic-btn';
          button.innerHTML = `<span class="text-left font-semibold text-gray-800">${chapter.title}</span><i data-lucide="chevron-right" class="w-5 h-5 text-cbse-blue"></i>`;
          button.addEventListener('click', e => handleTopicSelection(chapter.id, e.currentTarget));
          topicListEl.appendChild(button);
        });
        chapterSelectionContainerEl.classList.remove('hidden');
      } else {
        topicListEl.innerHTML = `<p class="text-center text-gray-500">No chapters available for this section yet.</p>`;
      }
      lucide.createIcons();
    }

    function handleStartQuiz() {
      if (selectedTopic && selectedDifficulty) {
        let url = `quiz-engine.html?class=${currentClass}&subject=${currentSubject}&topic=${selectedTopic}&difficulty=${selectedDifficulty}`;
        if (selectedSubSubject) url += `&sub_subject=${selectedSubSubject}`;
        if (selectedTopicTitle) url += `&chapter_title=${encodeURIComponent(selectedTopicTitle)}`;
        window.location.href = url;
      } else {
        errorMessageEl.classList.remove('hidden');
      }
    }

    // ----------------------------
    // Initialization
    // ----------------------------
    function initPage() {
      lucide.createIcons();
      const params = new URLSearchParams(window.location.search);
      currentSubject = decodeURIComponent(params.get('subject') || 'Science');
      currentClass = params.get('class') || '9';

      if (curriculumData[currentClass]?.[currentSubject]) {
        renderSubSubjects(currentClass, currentSubject);
      } else {
        pageTitleEl.textContent = 'Error: Invalid Subject/Class';
      }

      difficultySelectionEl.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', e => handleDifficultySelection(e.currentTarget.dataset.difficulty, e.currentTarget));
      });

      startQuizBtn.addEventListener('click', handleStartQuiz);
    }

    document.addEventListener('DOMContentLoaded', initPage);
  </script>
</body>
</html>
