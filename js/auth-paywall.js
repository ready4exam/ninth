// js/auth-paywall.js
// Handles Firebase Authentication (Google Sign-In/Out) and initial access check.

import { getInitializedClients } from './config.js';
import { updateAuthUI } from './ui-renderer.js';

// **FIX:** We must import the specific modular functions needed for Google Sign-In.
import { 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";


// Global state tracking
let currentAuthUser = null;

/**
 * Initializes the Firebase Auth listener.
 * This should be called once when the app starts.
 * @param {Function} onAuthStateChangedCallback - Callback to run when auth state changes.
 */
export function initializeAuthListener(onAuthStateChangedCallback) {
    const { auth } = getInitializedClients();

    if (!auth) {
        console.error("[AUTH] Firebase Auth not initialized. Check js/config.js.");
        return;
    }

    // Set up the listener to track user state changes
    auth.onAuthStateChanged((user) => {
        currentAuthUser = user;
        // Update the header UI based on the user object
        updateAuthUI(user);
        // Run the main callback provided by quiz-engine.js (onAuthChange)
        onAuthStateChangedCallback(user);
    });
}

/**
 * Initiates Google Sign-In using Firebase Auth Pop-up.
 */
export async function signInWithGoogle() {
    const { auth } = getInitializedClients();
    if (!auth) {
        throw new Error("Firebase Auth not available.");
    }

    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        console.log("[AUTH] Google Sign-In successful:", result.user.email);
        return result.user;
    } catch (error) {
        console.error("[AUTH ERROR] Google Sign-In failed:", error);
        throw error;
    }
}

/**
 * Initiates Firebase Sign-Out.
 */
export async function signOut() {
    const { auth } = getInitializedClients();
    if (!auth) {
        throw new Error("Firebase Auth not available.");
    }
    try {
        await auth.signOut();
        console.log("[AUTH] User signed out.");
    } catch (error) {
        console.error("[AUTH ERROR] Sign-out failed:", error);
    }
}

/**
 * Checks the user's access status. 
 * Access is only granted if the user is explicitly signed in (non-anonymous).
 * @returns {Promise<boolean>} - True if logged in, non-anonymous, false otherwise.
 */
export function checkAccess() {
    const isAccessGranted = currentAuthUser && !currentAuthUser.isAnonymous;
    
    if (isAccessGranted) {
         console.log("[ACCESS CHECK] User authenticated with Google. Access granted.");
         return true;
    }
    
    // If not authenticated via Google, access is denied.
    console.log("[ACCESS CHECK] User not authenticated via Google. Access denied (Sign-in required).");
    return false;
}

/**
 * Exposes the current authenticated user object.
 */
export function getCurrentUser() {
    return currentAuthUser;
}

// Attach the new sign-in/out methods to the window for use in event listeners (e.g., in quiz-engine.js)
window.quizEngine = window.quizEngine || {};
window.quizEngine.handleSignIn = signInWithGoogle;
window.quizEngine.handleSignOut = signOut;
