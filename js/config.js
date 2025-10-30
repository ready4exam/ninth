// js/config.js (Corrected version)

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
    signOut as firebaseSignOut
    // setLogLevel REMOVED
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
export async function initializeServices() {
    if (isInitialized) {
        console.warn("[CONFIG] Services already initialized.");
        return;
    }

    // 1. Initialize Firebase App
    if (Object.keys(firebaseConfig).length > 0) {
        firebaseApp = initializeApp(firebaseConfig);
        console.log("[CONFIG] Firebase app initialized.");
    } else {
        console.error("[CONFIG ERROR] firebaseConfig is empty. Cannot initialize Firebase.");
        throw new Error("Missing Firebase configuration.");
    }

    // 2. Initialize Firebase Services
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    console.log("[CONFIG] Firebase Auth and Firestore initialized.");

    // 3. Initialize Supabase Client
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        // Supabase client initialization (Assuming v2 modular style)
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("[CONFIG] Supabase client initialized.");
    } else {
        console.warn("[CONFIG WARNING] Supabase URL or Key missing. Supabase client not initialized.");
    }
    
    // 4. Initial Authentication (Secures userId for Firestore)
    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("[CONFIG] Signed in with custom token.");
        } else {
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
