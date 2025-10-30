// js/config.js
// Centralized configuration and initialization for all services (Firebase/Firestore/Auth and Supabase).

// --- Mandatory Global Variables ---
// __firebase_config and __initial_auth_token are provided by the hosting environment.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Firebase Imports ---
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

// --- Supabase Imports ---
// Assumes Supabase config is passed via global variables or is hardcoded if not provided by the environment.
// For this project, we assume the Supabase client is also provided or initialized here.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.4/+esm';

// --- Internal State ---
let firebaseApp = null;
let db = null;
let auth = null;
let supabase = null;
let isInitialized = false;

// --- Supabase Config (Placeholder - Replace with actual credentials if needed) ---
const SUPABASE_URL = 'https://your-supabase-url.supabase.co'; 
const SUPABASE_ANON_KEY = 'your-anon-key'; 

/**
 * Initializes all core services (Firebase and Supabase).
 * Must be called once before using any services.
 */
export async function initializeServices() {
    if (isInitialized) {
        console.warn("[CONFIG] Services already initialized.");
        return;
    }
    
    // 1. Initialize Firebase App
    if (Object.keys(firebaseConfig).length === 0) {
        console.error("[CONFIG ERROR] Firebase config is empty.");
        return;
    }
    
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    
    // Enable debug logging as per project plan
    setLogLevel('debug');
    
    // 2. Initialize Supabase Client
    if (SUPABASE_URL === 'https://your-supabase-url.supabase.co') {
        console.error("[CONFIG ERROR] Supabase URL is a placeholder. Data fetching will fail.");
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // 3. Initial Authentication (Secures userId for Firestore)
    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("[CONFIG] Signed in with custom token.");
        } else {
            // Sign in anonymously if no custom token is provided
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
 * @returns {{supabase: Object, db: Object}} The initialized client objects.
 */
export function getInitializedClients() {
    if (!isInitialized) {
        console.error("[CONFIG ERROR] Attempted to get clients before initialization.");
        throw new Error("Core services must be initialized first.");
    }
    return { supabase, db };
}

/**
 * Retrieves the Firebase Auth instance.
 * @returns {Object} The Firebase Auth instance.
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
 * This is the function that was missing!
 * @returns {Object | null} The current user object, or null if logged out.
 */
export function getAuthUser() {
    if (!auth) return null;
    return auth.currentUser;
}

/**
 * Exposes the Firebase sign-out function.
 */
export const signOutUser = firebaseSignOut;
