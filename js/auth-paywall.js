// js/auth-paywall.js
// Handles Firebase Authentication and user state for access control (Payment removed).
import { getInitializedClients } from './config.js'; // Import the safe client getter

// Define a placeholder for the application ID for Firestore paths (optional for now)
const APP_ID = "ready4exam";

// Global state tracking
let currentAuthUser = null; 

/**
 * Initializes the Firebase Auth listener.
 * This should be called once when the app starts.
 * @param {Function} onAuthStateChangedCallback - Callback to run when auth state changes.
 */
export function initializeAuthListener(onAuthStateChangedCallback) {
    // Safely retrieve the auth client
    const { auth } = getInitializedClients();

    if (!auth) {
        console.error("[AUTH] Firebase Auth not initialized. Check js/config.js.");
        return;
    }
    
    // The listener is the key to managing state and running subsequent logic
    auth.onAuthStateChanged((user) => {
        currentAuthUser = user;
        // The callback function in quiz-engine.js will now proceed with loading or showing the paywall
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
    
    // NOTE: This assumes 'firebase' is available globally (via CDN in config.js)
    const provider = new firebase.auth.GoogleAuthProvider(); 
    try {
        const result = await auth.signInWithPopup(provider);
        console.log("[AUTH] Google Sign-In successful:", result.user.email);
        return result.user;
    } catch (error) {
        // Log authentication errors without using alert()
        console.error("[AUTH ERROR] Google Sign-In failed.", error.message);
        throw new Error("Authentication failed. Check console for details.");
    }
}

/**
 * Logs the current user out using Firebase Auth.
 */
export async function signOut() {
    const { auth } = getInitializedClients();
    if (!auth) {
        console.error("Firebase Auth not available.");
        return;
    }

    try {
        await auth.signOut();
        console.log("[AUTH] User signed out.");
        // Reload the page to reset the application state after logout
        window.location.reload(); 
    } catch (error) {
        console.error("[AUTH ERROR] Sign out failed:", error);
    }
}

/**
 * Checks if the current user is authenticated (replacing the payment check).
 * Access is granted if the user is logged in.
 * @returns {boolean} - True if user is authenticated, false otherwise.
 */
export function checkAccessStatus() {
    // If currentAuthUser is not null, the user is authenticated, and access is granted.
    return currentAuthUser !== null;
}

// Expose the current user function
export function getCurrentUser() {
    return currentAuthUser;
}

// NOTE: All payment-related functions (initiateRazorpayPayment, grantAccess) have been removed.
