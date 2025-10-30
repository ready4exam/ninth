import { getInitializedClients } from './config.js'; 

import {
    GoogleAuthProvider,
    getRedirectResult as firebaseGetRedirectResult,
    signInWithPopup,
    signInWithRedirect,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";


const LOG_TAG = '[AUTH-PAYWALL-MINIMAL]';

let authInstance = null;
const googleProvider = new GoogleAuthProvider();

/**
 * Internal helper to retrieve the initialized Firebase Auth instance.
 */
const getAuthInstance = () => {
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
};

/**
 * Placeholder for the function in quiz-engine.js that should run when 
 * the authentication state changes. This is necessary for the quiz to load.
 * * @param {import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js").User|null} user - The current authenticated user object or null.
 */
const onAuthChangeCallback = (user) => {
    console.log(LOG_TAG, 'Auth state changed. User ID:', user ? user.uid : 'Signed Out');
    // NOTE: Your application needs to call the quiz-engine's load function here.
    // Example: if (user) quizEngine.loadQuiz();
};

/**
 * Checks if the user is currently authenticated (logged in).
 * This function is required by quiz-engine.js to determine access.
 * @returns {boolean} True if a user is signed in, false otherwise.
 */
const checkAccess = () => {
    try {
        // Access is granted if Firebase has a current user
        return !!getAuthInstance().currentUser;
    } catch (e) {
        // If Auth isn't initialized yet, assume no access.
        return false;
    }
};


/**
 * Initializes the Auth components and sets up listeners.
 * RENAMED to initializeAuthListener to fix dependency error in quiz-engine.js
 */
const initializeAuthListener = async () => {
    try {
        const auth = getAuthInstance();
        
        // 1. Set up the primary auth state listener.
        onAuthStateChanged(auth, onAuthChangeCallback);
        console.log(LOG_TAG, 'Auth state listener established.');

        // 2. IMPORTANT: Check for pending redirect result. 
        // This resolves the user sign-in if the previous attempt ended in a redirect (the fallback).
        await getGoogleRedirectResult(); 

        console.log(LOG_TAG, 'Redirect result check completed.');
    } catch (error) {
        console.error(LOG_TAG, 'Failed to initialize Auth Paywall:', error);
    }
};


/**
 * Checks for a pending redirect result on page load.
 */
const getGoogleRedirectResult = () => {
    try {
        const auth = getAuthInstance();
        return firebaseGetRedirectResult(auth);
    } catch (error) {
        console.error(LOG_TAG, 'Failed to get auth instance for redirect check:', error);
        return Promise.reject(error);
    }
};

/**
 * Primary function to initiate Google Sign-In. Implements the essential 
 * Popup-to-Redirect fallback to handle COOP and cancellation errors 
 * common in iFrames and restrictive hosting environments like GitHub Pages.
 */
const signInWithGoogle = () => {
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
                return signInWithRedirect(auth, googleProvider)
                    .catch(redirectError => {
                        console.error(LOG_TAG, 'FATAL ERROR: signInWithRedirect also failed:', redirectError);
                        throw redirectError;
                    });
            } else {
                // Log and throw other, non-COOP related errors (e.g., network failure).
                console.error(LOG_TAG, 'Google sign-in failed with unexpected error:', error);
                throw error;
            }
        });
};

// This is the ONLY place where functions are exported.
export { signInWithGoogle, getGoogleRedirectResult, initializeAuthListener, checkAccess };
