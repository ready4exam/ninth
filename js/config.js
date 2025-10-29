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

// Initialize Firebase and expose global variables for use in science.html
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

const supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
