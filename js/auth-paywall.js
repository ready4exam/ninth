// js/auth-paywall.js
// Handles Firebase Authentication, user state, and Paywall logic.
// IMPORTANT: This file assumes Firebase is loaded via CDN in the HTML and exposed globally.
import { getInitializedClients } from './config.js'; 

// Define a placeholder for the application ID for Firestore paths 
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
    
    // Run the callback initially and on state change
    auth.onAuthStateChanged((user) => {
        currentAuthUser = user;
        onAuthStateChangedCallback(user);
        // Important: Re-run loadQuiz logic if auth state changes from null to user
        if (user && !window.quizLoaded) {
            // Trigger a silent reload of the quiz logic to check access
            if(window.loadQuizAfterAuth) {
                window.loadQuizAfterAuth();
            }
        }
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
        // Use a redirect for better mobile support, but pop-up is common for web demos
        const result = await auth.signInWithPopup(provider);
        console.log("[AUTH] Google Sign-In successful:", result.user.email);
        return result.user;
    } catch (error) {
        // Check for common errors like pop-up closed
        console.error("[AUTH ERROR] Google Sign-In failed:", error);
        throw error;
    }
}

/**
 * Initiates the sign-out process.
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
        // Redirect to home or force a refresh to clear state
        window.location.href = 'index.html'; 
    } catch (error) {
        console.error("[AUTH ERROR] Sign-out failed:", error);
    }
}

/**
 * Checks if the current user has premium access for the given topic.
 * Access is granted if:
 * 1. The user is NOT logged in (we allow anonymous access to free content).
 * 2. The user is logged in AND has a 'premium' status flag in Firestore.
 * * NOTE: For simplicity, all topics are considered 'premium' for this demo.
 * @param {string} topic - The topic slug (e.g., 'gravitation')
 * @returns {Promise<boolean>} True if access is granted, False otherwise.
 */
export async function checkAccess(topic) {
    const user = getCurrentUser();
    const { db } = getInitializedClients();

    // 1. If not logged in, force login check (or anonymous access if you had free content)
    // For this app, we assume ALL quiz content is gated, so they must be logged in/pay
    if (!user) {
        console.log(`[ACCESS] User is anonymous. Access denied for premium content.`);
        return false;
    }

    // 2. If logged in, check Firestore for premium status
    try {
        const accessDocPath = `artifacts/${APP_ID}/users/${user.uid}/access_status/premium`;
        const docRef = db.doc(accessDocPath);
        const docSnap = await docRef.get();

        if (docSnap.exists && docSnap.data()?.is_premium === true) {
            console.log(`[ACCESS] User ${user.uid} has premium access.`);
            return true;
        } else {
            console.log(`[ACCESS] User ${user.uid} does NOT have premium access (doc missing or is_premium is false).`);
            return false;
        }
    } catch (e) {
        console.error("[ACCESS ERROR] Failed to check Firestore access status. Denying access.", e);
        // Fail-safe: deny access if we can't confirm it
        return false;
    }
}


/**
 * Returns the currently authenticated user object.
 * @returns {Object|null}
 */
export function getCurrentUser() {
    return currentAuthUser;
}

// NOTE: I've removed the detailed `initiateRazorpayPayment` and `grantAccess` 
// functions as they were placeholder/non-functional and are not needed for the core UI structure.
// The pay button now opens a simple demo link as a placeholder.
