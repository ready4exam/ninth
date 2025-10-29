// config.js
// This file initializes all external services and makes the clients globally available
// as required by the modular JavaScript architecture.

// NOTE: We assume the Supabase client library is loaded via <script> tag in the HTML.

// --- 1. FIREBASE CONFIGURATION ---
// IMPORTANT: Replace these placeholder values with your actual Firebase project configuration.
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    // ... rest of Firebase config
};

// Initialize Firebase App
const app = firebase.initializeApp(firebaseConfig);

// Initialize Firebase Services globally (using the compat APIs loaded in quiz-engine.html)
// These global instances are used by the js/auth-paywall.js and js/api.js modules.
window.auth = app.auth();
window.db = firebase.firestore();
window.analytics = firebase.analytics();

// --- 2. SUPABASE CONFIGURATION ---
// IMPORTANT: Replace these placeholder values with your actual Supabase URL and Anon Key.
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase Client
// We now define it as 'export const' so it can be correctly imported by api.js
export const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

// NOTE: We no longer need to set window.supabase if we are importing it in api.js.

console.log("[CONFIG] Firebase clients initialized globally. Supabase client exported.");
