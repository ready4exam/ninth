import { getInitializedClients } from './config.js'; 

import {
    GoogleAuthProvider,
    getRedirectResult as firebaseGetRedirectResult,
    signInWithPopup,
    signInWithRedirect,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";


const LOG_TAG = '[AUTH-PAYWALL-MINIMAL]';

let authInstance = null;
const googleProvider = new GoogleAuthProvider();

/**
 * Internal helper to retrieve the initialized Firebase Auth instance.
 */
function getAuthInstance() {
    if (!authInstance) {
        try {
            // Attempt to get the initialized clients from config.js
            const clients = getInitializedClients();
            authInstance = clients.auth;
        } catch (e) {
             console.error(LOG_TAG, "Auth instance not available. Ensure services are initialized in config.js.", e);
             throw new Error("Auth not initialized.");
        }
    }
    return authInstance;
}

/**
 * Checks for a pending redirect result on page load.
 * This function MUST be called once on application startup to resolve sign-ins 
 * completed via the signInWithRedirect fallback.
 */
export function getGoogleRedirectResult() {
    try {
        const auth = getAuthInstance();
        return firebaseGetRedirectResult(auth);
    } catch (error) {
        console.error(LOG_TAG, 'Failed to get auth instance for redirect check:', error);
        return Promise.reject(error);
    }
}

/**
 * Primary function to initiate Google Sign-In. Implements the essential 
 * Popup-to-Redirect fallback to handle COOP and cancellation errors 
 * common in iFrames and restrictive hosting environments like GitHub Pages.
 */
export function signInWithGoogle() {
    const auth = getAuthInstance();

    console.log(LOG_TAG, 'Initiating Google sign-in (Popup attempt)...');

    // 1. Attempt signInWithPopup first (v9 modular style).
    return signInWithPopup(auth, googleProvider)
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
                return signInWithRedirect(auth, googleProvider)
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

// Export only the two required functions for a minimal Google Sign-On module.
export { signInWithGoogle, getGoogleRedirectResult };
