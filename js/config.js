// js/config.js
// Handles initialization for Firebase and Supabase clients

// --- Client Keys (REPLACE WITH YOUR ACTUAL KEYS) ---
const firebaseConfig = {
    apiKey: "AIzaSyAXdKiYRxBKAj280YcNuNwlKKDp85xpOWQ", 
    authDomain: "quiz-signon.firebaseapp.com",
    projectId: "quiz-signon",
    storageBucket: "quiz-signon.firebasestorage.app",
    messagingSenderId: "863414222321",
    appId: "G-4EFDM0CRYY"
};

const supabaseUrl = 'https://gkyvojcmqsgdynmitcuf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdreXZvamNtcXNnZHlubWl0Y3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDQ0OTcsImV4cCI6MjA3NjMyMDQ5N30.5dn5HbXxQ5sYNECS9o3VxVeyL6I6Z2Yf-nmPwztx1hE';
// ---------------------------------------------------

let auth = null;
let db = null;
let supabase = null;
let isReady = false;

/**
 * Initializes all client services (Firebase, Firestore, Supabase).
 * This function should only run once after all CDNs are guaranteed to be loaded.
 */
function initServices() {
    try {
        // 1. Initialize Firebase App (assuming firebase, firebase.firestore are loaded via CDN)
        const firebaseApp = firebase.initializeApp(firebaseConfig);
        
        // 2. Set up Firebase Auth and Firestore references
        auth = firebase.auth();
        db = firebase.firestore();
        
        // 3. Initialize Supabase Client (assuming supabase is loaded via CDN)
        // We must call the createClient function provided by the CDN, which is exposed globally
        supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

        isReady = true;
        console.log("[CONFIG] All services initialized successfully.");
        
    } catch (error) {
        console.error("[CONFIG ERROR] Failed to initialize services:", error);
    }
}

/**
 * Public getter to safely retrieve initialized clients.
 * Consumers must call this function to get the clients.
 * @returns {{auth: Object, db: Object, supabase: Object}}
 */
export function getInitializedClients() {
    if (!isReady) {
        console.warn("[CONFIG WARNING] Clients requested before DOMContentLoaded. Results may be undefined.");
    }
    return { auth, db, supabase };
}

// Ensure initialization only happens after the DOM (and all CDNs) are loaded
document.addEventListener('DOMContentLoaded', initServices);
