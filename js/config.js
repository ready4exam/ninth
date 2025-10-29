// config.js

// --- Supabase Configuration (Already defined globally in the HTML or earlier in this file) ---
window.SUPABASE_URL = 'https://gkyvojcmqsgdynmitcuf.supabase.co'; // Example: 'https://xyz123.supabase.co'
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdreXZvamNtcXNnZHlubWl0Y3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDQ0OTcsImV4cCI6MjA3NjMyMDQ5N30.5dn5HbXxQ5sYNECS9o3VxVeyL6I6Z2Yf-nmPwztx1hE'

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyAXdKiYRxBKAj280YcNuNwlKKDp85xpOWQ",
    authDomain: "quiz-signon.firebaseapp.com",
    projectId: "quiz-signon",
    storageBucket: "quiz-signon.firebasestorage.app",
    messagingSenderId: "863414222321",
    appId: "1:863414222321:web:819f5564825308bcd9d850",
    measurementId: "G-4EFDM0CRYY"
};

// Define code version globally for tracking
const codeVersion = 'perfect_2';

// --- Firebase Initialization ---
// NOTE: This assumes all Firebase compatibility scripts are loaded in the HTML before config.js.
// Since 'firebase' is a global variable from the CDN, this should run successfully.
try {
    const app = firebase.initializeApp(firebaseConfig);
    const auth = app.auth();
    const db = app.firestore();
    const analytics = firebase.analytics(); // Initialize Analytics

    console.log(`Firebase initialized. Code Version: ${codeVersion}`);

    // Log events in a non-blocking manner (only runs after the script executes)
    analytics.logEvent('app_load', {
        code_version: codeVersion,
        environment: 'production'
    });
    analytics.logEvent('debug_connection_test', {
        source: 'web_init_from_config_js'
    });

} catch (e) {
    console.error("Firebase initialization error, ensure all Firebase libraries are loaded:", e);
}


// --- Supabase Initialization (THE CRITICAL FIX) ---

if (typeof window.supabase !== 'undefined') {
    // ✅ FIX: Overwrite the global window.supabase variable (which currently holds the factory function)
    // with the initialized client instance. This avoids the TDZ error and keeps the global name.
    window.supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    console.log('Supabase client successfully initialized and set globally.');
} else {
    console.error('Supabase initialization failed: Supabase library not loaded.');
}
