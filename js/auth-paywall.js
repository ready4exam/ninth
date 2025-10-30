// js/auth-paywall.js

// FIX: getAuthInstance is not a named export. We use getInitializedClients to get the 'auth' object.
import { getInitializedClients, getAuthUser, signOutUser } from './config.js'; 
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import * as API from './api.js';

// --- Internal State ---
const googleProvider = new GoogleAuthProvider();
let auth = null; // Will store the Firebase Auth object

/**
 * Initializes the Firebase Auth listener. 
 */
export function initializeAuthListener(callback) {
    // FIX: Retrieve the auth object from the initialized clients
    auth = getInitializedClients().auth; 

    if (!auth) {
        console.error("[AUTH] Firebase Auth not available. Listener cannot be initialized.");
        return;
    }

    // This listener immediately checks the current state and then listens for future changes.
    onAuthStateChanged(auth, (user) => {
        // user is null if no one is signed in (or signed out).
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
        await signInWithPopup(auth, googleProvider);
        console.log("[AUTH] Successfully signed in with Google.");
    } catch (error) {
        console.error("[AUTH ERROR] Google sign-in failed:", error);
    }
}

/**
 * Signs the current user out of Firebase.
 */
export async function signOut() {
    if (!auth) {
        console.error("[AUTH ERROR] Auth service not initialized.");
        return;
    }
    try {
        // Use the exported signOutUser function from config.js
        await signOutUser(auth); 
        console.log("[AUTH] User signed out.");
    } catch (error) {
        console.error("[AUTH ERROR] Sign-out failed:", error);
    }
}


/**
 * Checks if the currently authenticated user has access to the specified topic.
 */
export async function checkAccess(topicSlug) {
    const user = getAuthUser();
    
    // Rule 1: Must be authenticated
    if (!user) {
        console.warn("[PAYWALL] Access denied: User is not authenticated (must use Google Login).");
        return false;
    }
    
    // Rule 2: Check against a list of free topics (e.g., 'motion' is free)
    const FREE_TOPICS = ['motion', 'introduction-to-topic-x']; 
    if (FREE_TOPICS.includes(topicSlug)) {
        console.log(`[PAYWALL] Access granted for free topic: ${topicSlug}`);
        return true;
    }

    // Rule 3: Check API/Firestore for premium access (assuming API.checkPremiumStatus is implemented)
    try {
        const hasPremium = await API.checkPremiumStatus(user.uid);
        if (hasPremium) {
            console.log("[PAYWALL] Access granted: User has premium status.");
            return true;
        }
    } catch(error) {
        console.error("[PAYWALL ERROR] Failed to check premium status (assuming no premium):", error);
    }

    console.warn(`[PAYWALL] Access denied: Topic ${topicSlug} requires premium access.`);
    return false;
}
