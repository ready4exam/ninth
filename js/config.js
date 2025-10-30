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
    signInWithCustomToken, 
    onAuthStateChanged, 
    signOut as firebaseSignOut
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

// --- Supabase Config (LIVE CREDENTIALS) ---
const SUPABASE_URL = 'https://gkyvojcmqsgdynmitcuf.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdreXZvamNtcXNnZHlubWl0Y3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDQ0OTcsImV4cCI6MjA3NjMyMDQ5N30.5dn5HbXxQ5sYNECS9o3VxVeyL6I6Z2Yf-nmPwztx1hE'; 

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
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("[CONFIG] Supabase client initialized.");

    
    // 3. Initial Authentication (Only checks for custom token)
    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("[CONFIG] Signed in with custom token.");
        } 
        // NOTE: signInAnonymously is intentionally removed to enforce Google Login.
    } catch (error) {
        // If custom token fails, we log a warning and let the app continue 
        // with a null user, forcing the paywall/Google Sign-In prompt.
        console.warn("[CONFIG WARNING] Custom token sign-in failed. Relying on Google Sign-In.", error);
    }

    isInitialized = true;
    console.log("[CONFIG] All services initialized successfully.");
}

/**
 * Retrieves the initialized Supabase, Firestore, and Auth clients.
 * This function is used by auth-paywall.js to get the 'auth' object.
 */
export function getInitializedClients() {
    if (!isInitialized) {
        console.error("[CONFIG ERROR] Attempted to get clients before initialization.");
        throw new Error("Core services must be initialized first.");
    }
    // FIX: Ensure 'auth' is included in the returned object
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
