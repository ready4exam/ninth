// js/auth-paywall.js
// Handles Firebase Authentication (Google Sign-In/Out) and initial access check.
import { getInitializedClients } from './config.js';
import { updateAuthUI, updatePaywallContent } from './ui-renderer.js';

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

    // Note: 'firebase' must be globally available from the CDN import in quiz-engine.html
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
 * if the user is currently authenticated (logged in).
 * @returns {Promise<boolean>} - True if logged in, false otherwise.
 */
export async function checkPaymentStatus() {
    // NOTE: In a real app, this would check Firestore for a subscription record.
    // For now, access is granted if the user is authenticated.
    if (currentAuthUser) {
         console.log("[ACCESS CHECK] Payments disabled. Access granted to authenticated user.");
         return true;
    }
    
    // If not authenticated, access is denied.
    console.log("[ACCESS CHECK] User not authenticated. Access denied.");
    return false;
}

/**
 * Exposes the current authenticated user object.
 */
export function getCurrentUser() {
    return currentAuthUser;
}
