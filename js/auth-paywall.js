import { getInitializedClients } from './config.js'; 

import {
    onAuthStateChanged,
    GoogleAuthProvider,
    getRedirectResult,
    signInWithPopup,
    signInWithRedirect,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";


const LOG_TAG = '[AUTH-PAYWALL]';

let authInstance = null;
const googleProvider = new GoogleAuthProvider();


/**
 * Initializes the Auth components and sets up listeners.
 * This MUST be called AFTER initializeServices() from config.js 
 * has successfully completed.
 */
export async function initializeAuthPaywall() {
    try {
        const clients = getInitializedClients();
        authInstance = clients.auth;
        
        if (!authInstance) {
            console.error(LOG_TAG, "Auth instance not found. Initialization failed.");
            return;
        }

        // 1. Set up the primary auth state listener.
        onAuthStateChanged(authInstance, onAuthChangeCallback);
        console.log(LOG_TAG, 'Auth state listener established.');

        // 2. IMPORTANT: Check for pending redirect result. 
        // This resolves the user sign-in if the previous attempt ended in a redirect (the fallback).
        await checkRedirectResult(); 

        console.log(LOG_TAG, 'Redirect result check completed.');
    } catch (error) {
        console.error(LOG_TAG, 'Failed to initialize Auth Paywall:', error);
    }
}

/**
 * Placeholder for the function in quiz-engine.js that should run when 
 * the authentication state changes (i.e., when a user signs in or out).
 * * IMPORTANT: You need to ensure the quiz logic (loadQuiz, etc.) is called 
 * from here when 'user' is not null.
 * * @param {import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js").User|null} user - The current authenticated user object or null.
 */
function onAuthChangeCallback(user) {
    console.log(LOG_TAG, 'Auth state changed. User ID:', user ? user.uid : 'Signed Out');
    
    // Your application needs to make the quiz-engine's onAuthChange function 
    // available here or call it if it's imported/global.
    // Example call (assuming 'onAuthChange' is defined/imported elsewhere):
    // if (typeof onAuthChange === 'function') {
    //    onAuthChange(user); 
    // }
}


/**
 * Checks for a pending redirect result on page load.
 */
async function checkRedirectResult() {
    try {
        // getRedirectResult resolves the sign-in that occurred via redirect.
        const result = await getRedirectResult(authInstance);
        if (result && result.credential) {
            console.log(LOG_TAG, 'REDIRECT SUCCESS: Successfully resolved user credential.');
        }
    } catch (error) {
        // Log any errors that occurred during the redirect result check
        console.error(LOG_TAG, 'Redirect result check error:', error);
    }
}


/**
 * Primary function to initiate Google Sign-In. Implements the essential 
 * Popup-to-Redirect fallback to handle COOP and cancellation errors 
 * common in iFrames and restrictive hosting environments like GitHub Pages.
 */
export function signInWithGoogle() {
    if (!authInstance) {
        console.error(LOG_TAG, "Auth instance not initialized. Cannot sign in.");
        return Promise.reject(new Error("Auth not initialized. Ensure initializeAuthPaywall was called."));
    }

    console.log(LOG_TAG, 'Initiating Google sign-in (Popup attempt)...');

    // 1. Attempt signInWithPopup first (v9 modular style).
    return signInWithPopup(authInstance, googleProvider)
        .then(result => {
            console.log(LOG_TAG, 'SUCCESS: Signed in via Popup.');
            return result;
        })
        .catch(error => {
            // Check for the known failure modes (COOP-related and cancellation).
            const isPopupFailure = error.code === 'auth/cancelled-popup-request' ||
                                   error.code === 'auth/popup-blocked';

            if (isPopupFailure) {
                // 2. FALLBACK: The popup failed to close/communicate. Redirect immediately.
                console.warn(LOG_TAG, `Popup failed (Code: ${error.code}). Initiating signInWithRedirect fallback.`);
                
                // This starts the redirect process. The page will reload.
                // Execution stops here.
                return signInWithRedirect(authInstance, googleProvider)
                    .catch(redirectError => {
                        console.error(LOG_TAG, 'FATAL ERROR: signInWithRedirect also failed:', redirectError);
                        throw redirectError; // Re-throw fatal errors
                    });
            } else {
                // Log and throw other, non-COOP related errors (e.g., network failure).
                console.error(LOG_TAG, 'Google sign-in failed with unexpected error:', error);
                throw error;
            }
        });
}

/**
 * Exposes the Firebase sign-out function.
 */
// FIX: Removed 'export' keyword from here to avoid duplicate export error.
function signOutUser() {
    if (!authInstance) {
        console.error(LOG_TAG, "Auth instance not initialized. Cannot sign out.");
        return Promise.resolve();
    }
    return signOut(authInstance);
}

// Export the necessary functions so other modules (like quiz-engine.js) can use them.
export { signInWithGoogle, initializeAuthPaywall, signOutUser, onAuthChangeCallback };
