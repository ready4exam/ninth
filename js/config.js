// js/config.js
// Centralized configuration and initialization for all services (Firebase/Firestore/Auth and Supabase).

// --- Mandatory Global Variables ---
// These must be set in a <script> tag BEFORE this module loads.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Firebase Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged, 
    signOut as firebaseSignOut
    // FIX: setLogLevel is removed from the modular imports to prevent Uncaught SyntaxError
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Supabase Imports ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.4/+esm';

// --- Internal State ---
let firebaseApp = null;
let db = null;
let auth = null;
let supabase = null;
let isInitialized = false;

// --- Supabase Config (Placeholder - REPLACE THESE) ---
const SUPABASE_URL = 'https://your-supabase-url.supabase.co'; 
const SUPABASE_ANON_KEY = 'your-anon-key'; 

/**
 * Initializes all core services (Firebase and Supabase).
 */
export async function initializeServices() {
    if (isInitialized) {
        console.warn("[CONFIG] Services already initialized.");
        return;
    }
    
    // 1. Initialize Firebase App
    if (Object.keys(firebaseConfig).length === 0) {
        console.error("[CONFIG ERROR] Firebase config is empty. Cannot initialize.");
        throw new Error("Missing Firebase configuration.");
    }
    
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    console.log("[CONFIG] Firebase app, Auth, and Firestore initialized.");

    // 2. Initialize Supabase Client
    if (SUPABASE_URL === 'https://your-supabase-url.supabase.co') {
        console.warn("[CONFIG WARNING] Supabase URL is a placeholder. Data fetching will likely fail.");
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("[CONFIG] Supabase client initialized.");

    
    // 3. Initial Authentication (Secures userId for Firestore)
    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("[CONFIG] Signed in with custom token.");
        } else {
            // This is the line that requires Anonymous Auth to be enabled in Firebase console
            await signInAnonymously(auth); 
            console.log("[CONFIG] Signed in anonymously.");
        }
    } catch (error) {
        // This is the error that triggers the "Failed to establish initial authentication session."
        console.error("[CONFIG ERROR] Initial authentication failed:", error);
        throw new Error("Failed to establish initial authentication session."); 
    }

    isInitialized = true;
    console.log("[CONFIG] All services initialized successfully.");
}

/**
 * Retrieves the initialized Supabase, Firestore, and Auth clients.
 */
export function getInitializedClients() {
    if (!isInitialized) {
        console.error("[CONFIG ERROR] Attempted to get clients before initialization.");
        throw new Error("Core services must be initialized first.");
    }
    return { supabase, db, auth };
}

/**
 * Retrieves the currently authenticated Firebase user.
 */
export function getAuthUser() {
    if (!auth) return null;
    return auth.currentUser;
}

/**
 * Exposes the Firebase sign-out function.
 */
export const signOutUser = firebaseSignOut;
