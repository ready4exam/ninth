// js/config.js
// Centralized configuration and initialization for all services (Firebase/Firestore/Auth and Supabase).

// --- Mandatory Global Variables ---
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
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.4/+esm';

// --- Internal State ---
let firebaseApp = null;
let db = null;
let auth = null;
let supabase = null;
let isInitialized = false;

// --- Supabase Config (Placeholder) ---
const SUPABASE_URL = 'https://gkyvojcmqsgdynmitcuf.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdreXZvamNtcXNnZHlubWl0Y3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDQ0OTcsImV4cCI6MjA3NjMyMDQ5N30.5dn5HbXxQ5sYNECS9o3VxVeyL6I6Z2Yf-nmPwztx1hE'; 

/**
 * Initializes all core services (Firebase and Supabase).
 */
export async function initServices() {
    if (isInitialized) return;
    
    console.log("[CONFIG] Initializing core services...");
    
    // 1. Firebase Initialization
    if (Object.keys(firebaseConfig).length > 0) {
        firebaseApp = initializeApp(firebaseConfig);
        auth = getAuth(firebaseApp);
        db = getFirestore(firebaseApp);
        // Optional: Set log level for debugging
        // setLogLevel('error'); 
        console.log("[CONFIG] Firebase initialized.");
    } else {
        console.warn("[CONFIG WARNING] Firebase config is missing. Authentication/Firestore will not function.");
        // Throw an error in a production setup
    }
    
    // 2. Supabase Initialization
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("[CONFIG] Supabase initialized.");
    } catch (e) {
        console.error("[CONFIG ERROR] Supabase initialization failed:", e);
    }
   
    // 3. Initial Authentication (Secures userId for Firestore)
    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("[CONFIG] Signed in with custom token.");
        } else {
            // Check if there is already a user (e.g., from a previous session)
            if (!auth.currentUser) { 
                await signInAnonymously(auth);
                console.log("[CONFIG] Signed in anonymously.");
            } else {
                 console.log("[CONFIG] Existing user session found.");
            }
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
