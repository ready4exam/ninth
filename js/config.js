// js/config.js
// Centralized configuration and initialization for all services (Firebase/Firestore/Auth and Supabase).

// --- Mandatory Global Variables ---\n
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Firebase Imports ---\n
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged, 
    signOut as firebaseSignOut,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Supabase Imports ---\n
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.4/+esm';

// --- Internal State ---\n
let firebaseApp = null;
let db = null;
let auth = null;
let supabase = null;
let isInitialized = false;

// --- Supabase Config (Placeholder - *** MUST BE REPLACED BY USER ***) ---\n
// NOTE: Replace these with your actual Supabase project credentials.
const SUPABASE_URL = 'https://your-supabase-url.supabase.co'; 
const SUPABASE_ANON_KEY = 'your-supabase-anon-key'; 

/**
 * Initializes all core services (Firebase and Supabase).
 */
export async function initializeServices() {
    if (isInitialized) return;

    // 1. Firebase Initialization
    try {
        firebaseApp = initializeApp(firebaseConfig);
        db = getFirestore(firebaseApp);
        auth = getAuth(firebaseApp);
        setLogLevel('Debug'); // Enable logging for debugging Firestore/Auth

        console.log("[CONFIG] Firebase services initialized.");
    } catch (error) {
        console.error("[CONFIG ERROR] Firebase initialization failed:", error);
        throw new Error("Firebase initialization failed.");
    }
    
    // 2. Supabase Initialization
    try {
        if (SUPABASE_URL.includes('your-supabase-url')) {
            console.error("[CONFIG WARNING] Supabase credentials are placeholders. Data fetching will fail.");
        }
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("[CONFIG] Supabase client initialized.");
    } catch (error) {
        console.error("[CONFIG ERROR] Supabase initialization failed:", error);
        throw new Error("Supabase initialization failed.");
    }
    
    // 3. Initial Authentication (Secures userId for Firestore)
    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("[CONFIG] Signed in with custom token.");
        } else {
            // Note: If the environment does not provide a custom token, sign in anonymously.
            await signInAnonymously(auth);
            console.log("[CONFIG] Signed in anonymously.");
        }
    } catch (error) {
        console.error("[CONFIG ERROR] Initial authentication failed:", error);
    }

    isInitialized = true;
    console.log("[CONFIG] All services initialized successfully.");
}

/**
 * Retrieves the initialized Supabase and Firestore clients.
 */
export function getInitializedClients() {
    if (!isInitialized) {
        console.error("[CONFIG ERROR] Attempted to get clients before initialization.");
        throw new Error("Core services must be initialized first.");
    }
    return { supabase, db, auth };
}

/**
 * Retrieves the Firebase Auth instance.
 */
export function getAuthInstance() {
    if (!isInitialized) {
        console.error("[CONFIG ERROR] Attempted to get auth instance before initialization.");
        throw new Error("Core services must be initialized first.");
    }
    return auth;
}

/**
 * Retrieves the currently authenticated Firebase user.
 * *** THIS IS THE REQUIRED EXPORT ***
 */
export function getAuthUser() {
    if (!auth) return null;
    return auth.currentUser;
}

/**
 * Exposes the Firebase sign-out function.
 */
export const signOutUser = firebaseSignOut;
