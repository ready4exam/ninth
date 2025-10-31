<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ready4Exam | Quiz Engine</title>

  <!-- Tailwind + Fonts -->
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet" />

  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'sans-serif'] },
          colors: {
            'cbse-blue': '#1a3e6a',
            'cbse-light': '#f5f7fa',
            'accent-gold': '#ffb703',
          }
        }
      }
    }
  </script>

  <style>
    body { font-family: 'Inter', sans-serif; background-color: #f5f7fa; }
    .option-label { transition: all 0.2s ease; }
    .option-label.correct { border-color: #16a34a; background-color: #dcfce7; }
    .option-label.incorrect { border-color: #dc2626; background-color: #fee2e2; }
    .option-label:hover { border-color: #2563eb; }
  </style>
</head>

<body class="min-h-screen flex flex-col">

  <!-- Header -->
  <header class="bg-cbse-blue shadow-md py-4 px-6 flex justify-between items-center">
    <div>
      <h1 id="quiz-page-title" class="text-2xl font-extrabold text-accent-gold tracking-wider">
        Ready4<span class="text-white">Exam</span>
      </h1>
      <p class="text-sm text-white opacity-90 italic">
        Ready4Exam helps students excel in school exams — a learning initiative by Ready4Industry.
      </p>
    </div>

    <div id="auth-nav-container" class="flex items-center space-x-4">
      <!-- Home button -->
      <a href="index.html"
         class="px-4 py-2 bg-white text-cbse-blue font-semibold rounded hover:bg-gray-100 transition">
        Home
      </a>

      <!-- Welcome message -->
      <span id="welcome-user" class="text-sm text-white hidden"></span>

      <!-- Difficulty badge -->
      <span id="difficulty-display"
        class="hidden px-3 py-1 text-sm font-semibold bg-yellow-100 text-yellow-800 rounded-full">
        Difficulty: Simple
      </span>

      <!-- Logout button -->
      <button id="logout-nav-btn"
        class="hidden px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">Sign Out</button>
    </div>
  </header>

  <!-- Status -->
  <div id="status-message" class="text-center p-6 font-semibold text-blue-700 hidden"></div>

  <!-- Loading Screen -->
  <div id="loading-screen" class="flex flex-col items-center justify-center flex-grow hidden">
    <div class="animate-pulse text-cbse-blue text-lg font-semibold">
      Initializing your quiz experience... please wait
    </div>
  </div>

  <!-- Paywall (Sign-In Screen) -->
  <div id="paywall-screen"
    class="hidden flex flex-col items-center justify-center p-12 transition-all duration-300 ease-in-out">
    <div class="bg-white rounded-xl p-10 shadow-xl border border-gray-200 text-center max-w-md">
      <h2 class="text-2xl font-bold text-gray-800 mb-4">Sign in to Continue</h2>
      <p class="text-gray-600 mb-6">
        Access premium quizzes for <b>Ready4Exam</b> by signing in with Google.
      </p>
      <button id="google-signin-btn"
        class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
        Sign in with Google
      </button>
    </div>
  </div>

  <!-- Quiz Content -->
  <main id="quiz-content" class="hidden flex flex-col items-center max-w-4xl mx-auto px-4 py
