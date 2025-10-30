// js/auth-paywall.js
// Handles Firebase Authentication (Google Sign-In/Out) and initial access check.
import { getInitializedClients, getAuthUser, signOutUser } from './config.js'; // NOTE: using signOutUser from config.js
import * as UI from './ui-renderer.js';

// **FIX:** We must import the specific modular functions needed for Google Sign-In.
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";


// Global state tracking
let currentAuthUser = null;
let authListenerCallback = null; // Store the callback from quiz-engine.js

/**
 * Initializes the Firebase Auth listener.
 * This should be called once when the app starts.
 * @param {Function} onAuthStateChangedCallback - Callback to run when auth state changes.
 */
export function initializeAuthListener(onAuthStateChangedCallback) {
    const { auth } = getInitializedClients();
    authListenerCallback = onAuthStateChangedCallback;

    if (!auth) {
        console.error("[AUTH] Firebase Auth not initialized. Check js/config.js.");
        return;
    }

    // Set up the listener to track user state changes
    auth.onAuthStateChanged((user) => {
        currentAuthUser = user;
        // Update the header UI based on the user object
        UI.updateAuthUI(user);
        // Run the main callback provided by quiz-engine.js (onAuthChange)
        if (authListenerCallback) {
            authListenerCallback(user);
        }
    });
}

/**
 * Initiates Google Sign-In using Firebase Auth Pop-up.
 */
export async function signInWithGoogle() {
    const { auth } = getInitializedClients();
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    try {
        // Use the new modular signInWithPopup
        const result = await signInWithPopup(auth, provider);
        console.log("[AUTH] Google Sign-In successful:", result.user.email);
        return result.user;
    } catch (error) {
        console.error("[AUTH ERROR] Google Sign-In failed:", error);
        // Display a more user-friendly error
        UI.updateStatus(`<span class="text-red-600">Login Failed:</span> ${error.message}`);
        throw error;
    }
}

/**
 * Initiates Firebase Sign-Out.
 */
export async function signOut() {
    try {
        // Use the exported sign-out function from config.js
        await signOutUser(); 
        console.log("[AUTH] User signed out.");
        // Re-run the auth check to apply paywall logic after sign out
        if (authListenerCallback) {
             authListenerCallback(null); 
        }
    } catch (error) {
        console.error("[AUTH ERROR] Sign-out failed:", error);
    }
}

/**
 * Checks the user's access status. Since payments are blocked, this only verifies
 * if the user is currently authenticated (logged in).
 * @returns {Promise<boolean>} - True if logged in (non-anonymous), false otherwise.
 */
export async function checkAccess(topic) {
    // NOTE: In a real app, this would check Firestore for a subscription record based on topic.
    
    // For now, access is granted if the user is AUTHENTICATED (i.e., NOT anonymous).
    if (currentAuthUser && !currentAuthUser.isAnonymous) {
         console.log(`[ACCESS CHECK] Payments disabled. Access granted to authenticated user ${currentAuthUser.email}.`);
         return true;
    }
    
    // If anonymous or null, access is denied.
    console.log("[ACCESS CHECK] User not authenticated or is anonymous. Access denied.");
    return false;
}

/**
 * Exposes the current authenticated user object.
 */
export function getCurrentUser() {
    return currentAuthUser;
}
