// js/auth-paywall.js
// Handles Firebase Authentication (Google Sign-In/Out). Payment logic is disabled.
import { getInitializedClients } from './config.js';

// Define a placeholder for the application ID for Firestore paths (not strictly needed here, but kept for context)
const APP_ID = "ready4exam";

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

    auth.onAuthStateChanged((user) => {
        currentAuthUser = user;
        // The callback updates UI/runs subsequent logic based on the user object
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

    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        // Use signInWithPopup for a non-breaking flow
        const result = await auth.signInWithPopup(provider);
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
 * Checks the user's access status. Since payments are blocked, this only verifies
 * if the user is currently authenticated.
 * @returns {Promise<boolean>} - True if logged in, false otherwise.
 */
export async function checkPaymentStatus() {
    // If the user is logged in, we grant access to the quiz content.
    if (currentAuthUser) {
         console.log("[ACCESS CHECK] Payments disabled. Access granted to authenticated user.");
         return true;
    }
    
    // If not authenticated, access is denied.
    return false;
}

/**
 * Exposes the current authenticated user object.
 */
export function getCurrentUser() {
    return currentAuthUser;
}

// NOTE: All exported functions are defined with 'export' inline to avoid the
// "Uncaught SyntaxError: Duplicate export" error. Payment related functions
// (initiatePayment, grantAccess) have been removed.
