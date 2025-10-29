// js/auth-paywall.js
// Handles Firebase Authentication (Google Sign-In/Out) and Enforces Google Login for Access.
import { getInitializedClients } from './config.js';
import { updateAuthUI, showView } from './ui-renderer.js';

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

    // Set up the listener
    auth.onAuthStateChanged((user) => {
        currentAuthUser = user;
        
        // 1. Update UI immediately (e.g., show username in header)
        updateAuthUI(user);

        // 2. Run the callback (usually in quiz-engine.js) to decide on next steps (load quiz or show paywall)
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
        // Specific error handling for pop-up blocked or user dismissed
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
        // After signing out, redirect to a safe page (e.g., the index/class selection screen)
        window.location.href = 'index.html'; 
    } catch (error) {
        console.error("[AUTH ERROR] Sign-out failed:", error);
    }
}

/**
 * CRITICAL ACCESS GATE: Checks the user's access status.
 * Access is granted ONLY if the user is authenticated AND is NOT anonymous.
 * @param {string} topicName - The name of the chapter/topic (used for display).
 * @returns {boolean} - True if access is granted (logged in via Google), false otherwise.
 */
export function checkAccessStatus(topicName) {
    // 1. Payment is deferred to Phase 2 (Access is free)
    // 2. Access requires a full Google sign-in (must NOT be anonymous)
    const accessGranted = currentAuthUser && !currentAuthUser.isAnonymous;

    if (accessGranted) {
        console.log("[ACCESS CHECK] User is logged in via Google. Access granted.");
        return true;
    }

    // If access is denied, show the paywall/login screen
    console.warn("[ACCESS CHECK] Access denied: User is not fully authenticated (or is anonymous).");
    // Show the login screen and update its content
    showView('paywall-screen'); 
    
    // We update the content here, assuming the quiz-engine calls the renderer function,
    // which in turn calls this function.
    // The topicName parameter is passed to update the paywall display in the renderer.
    // updatePaywallContent(topicName); // Assuming this call happens in quiz-engine.js after check.

    return false;
}

/**
 * Exposes the current authenticated user object.
 */
export function getCurrentUser() {
    return currentAuthUser;
}

// NOTE: All exported functions are defined with 'export' inline.
// Renamed checkPaymentStatus to checkAccessStatus for clarity.
