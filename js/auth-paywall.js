// js/auth-paywall.js

import { getAuthInstance, getAuthUser, signOutUser } from './config.js';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import * as API from './api.js';

// --- Internal State ---
const googleProvider = new GoogleAuthProvider();
let auth = null;

/**
 * Initializes the Firebase Auth listener. This function is the entry point
 * for the application's user flow after core services are initialized.
 * @param {Function} callback - The function (e.g., onAuthChange from quiz-engine.js) 
 * to call whenever the auth state changes.
 */
export function initializeAuthListener(callback) {
    auth = getAuthInstance();
    // This listener immediately checks the current state and then listens for future changes.
    onAuthStateChanged(auth, (user) => {
        // user is null if no one is signed in (or signed out).
        // The callback (onAuthChange) handles what to do next.
        callback(user); 
    });
    console.log("[AUTH] Auth state listener initialized.");
}

/**
 * Initiates the Google Sign-In process via a popup.
 */
export async function signInWithGoogle() {
    if (!auth) {
        console.error("[AUTH ERROR] Auth service not initialized.");
        return;
    }
    try {
        // This opens a Google sign-in popup
        await signInWithPopup(auth, googleProvider);
        console.log("[AUTH] Successfully signed in with Google.");
        // The onAuthStateChanged listener will handle the UI update via its callback.
    } catch (error) {
        console.error("[AUTH ERROR] Google sign-in failed:", error);
        // Handle popup closed, user cancelled, or other errors gracefully
    }
}

/**
 * Signs the current user out of Firebase.
 */
export async function signOut() {
    try {
        await signOutUser(auth);
        console.log("[AUTH] User signed out.");
        // The onAuthStateChanged listener will handle the UI update via its callback.
    } catch (error) {
        console.error("[AUTH ERROR] Sign-out failed:", error);
    }
}


/**
 * Checks if the currently authenticated user has access to the specified topic.
 * This is the core paywall logic.
 * @param {string} topicSlug - The topic identifier (e.g., 'motion').
 * @returns {Promise<boolean>} - True if access is granted, false otherwise.
 */
export async function checkAccess(topicSlug) {
    const user = getAuthUser();
    
    // Rule 1: Must be authenticated
    if (!user) {
        // Since we removed Anonymous login, any non-user is immediately denied access.
        console.warn("[PAYWALL] Access denied: User is not authenticated.");
        return false;
    }
    
    // Rule 2: Check against a list of free topics (e.g., 'motion' is free)
    const FREE_TOPICS = ['motion', 'introduction-to-topic-x']; 
    if (FREE_TOPICS.includes(topicSlug)) {
        console.log(`[PAYWALL] Access granted for free topic: ${topicSlug}`);
        return true;
    }

    // Rule 3: Check API/Firestore for premium access (e.g., subscription status)
    // NOTE: This assumes API.checkPremiumStatus is implemented in api.js
    try {
        const hasPremium = await API.checkPremiumStatus(user.uid);
        if (hasPremium) {
            console.log("[PAYWALL] Access granted: User has premium status.");
            return true;
        }
    } catch(error) {
        console.error("[PAYWALL ERROR] Failed to check premium status:", error);
    }

    console.warn(`[PAYWALL] Access denied: Topic ${topicSlug} requires premium access.`);
    return false;
}
