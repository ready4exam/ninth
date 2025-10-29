// js/config.js
// Handles initialization for Firebase and Supabase clients using the modern Modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


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
 * Initializes all client services (Firebase, Firestore, Supabase) using the modular SDK.
 * This function runs immediately upon module load.
 */
function initServices() {
    try {
        // 1. Initialize Firebase App
        const firebaseApp = initializeApp(firebaseConfig);
        
        // 2. Set up Firebase Auth and Firestore references
        auth = getAuth(firebaseApp);
        db = getFirestore(firebaseApp);
        
        // 3. Initialize Supabase Client (assuming window.supabase is globally available via CDN)
        if (window.supabase && window.supabase.createClient) {
            supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        } else {
            console.warn("[CONFIG WARNING] Supabase client library (CDN) not found.");
        }

        isReady = true;
        console.log("[CONFIG] All services initialized successfully.");
        
    } catch (error) {
        console.error("[CONFIG ERROR] Failed to initialize services:", error);
    }
}

// Execute initialization immediately
initServices();

/**
 * Public getter to safely retrieve initialized clients.
 * @returns {{auth: Object, db: Object, supabase: Object}}
 */
export function getInitializedClients() {
    if (!isReady) {
        // This warning now mostly serves as a diagnostic tool, as clients should be ready quickly.
        console.warn("[CONFIG WARNING] Clients requested before initialization complete. This should not happen with modular setup.");
    }
    return { auth, db, supabase };
}
