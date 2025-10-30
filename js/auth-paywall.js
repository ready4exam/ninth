// WARNING: This file removes the ES Module structure and defines functions globally
// to bypass persistent browser/module loader caching issues that caused the 
// "Does not provide an export named..." errors.

// --- Firebase Imports (Replaced by direct script tags in HTML, usually) ---
// Assuming these are loaded elsewhere, but keeping the provider definition here.
// You must ensure the following are loaded in your HTML *before* this script:
// 1. firebase-app.js
// 2. firebase-auth.js

const LOG_TAG = '[AUTH-PAYWALL-GLOBAL]';

// Define the necessary Firebase functions globally if not already available
const getAuthInstance = window.getAuthInstance;
const GoogleAuthProvider = window.GoogleAuthProvider;
const firebaseGetRedirectResult = window.getRedirectResult;
const signInWithPopup = window.signInWithPopup;
const signInWithRedirect = window.signInWithRedirect;
const onAuthStateChanged = window.onAuthStateChanged;
const firebaseSignOut = window.signOut;
const getInitializedClients = window.getInitializedClients;

let authInstance = null;
const googleProvider = new GoogleAuthProvider();

/**
 * Internal helper to retrieve the initialized Firebase Auth instance.
 */
window.getAuthInstance = () => { // Globally accessible
    if (!authInstance) {
        try {
            // Attempt to get the initialized clients from config.js (assuming config.js makes this available globally or in window)
            // If config.js uses ES Modules, this line must change. For now, assuming direct access.
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
 * * @param {object|null} user - The current authenticated user object or null.
 */
const onAuthChangeCallback = (user) => {
    console.log(LOG_TAG, 'Auth state changed. User ID:', user ? user.uid : 'Signed Out');
    // Your application needs to call the quiz-engine's load function here.
    // NOTE: If quiz-engine functions were exports, they must now be globally defined too (e.g., window.loadQuiz).
};

/**
 * Checks if the user is currently authenticated (logged in).
 * This function is required by quiz-engine.js to determine access.
 * @returns {boolean} True if a user is signed in, false otherwise.
 */
window.checkAccess = () => { // Globally accessible
    try {
        return !!window.getAuthInstance().currentUser;
    } catch (e) {
        return false;
    }
};


/**
 * Initializes the Auth components and sets up listeners.
 * RENAMED to initializeAuthListener to fix dependency error in quiz-engine.js
 */
window.initializeAuthListener = async () => { // Globally accessible
    try {
        const auth = window.getAuthInstance();
        
        // 1. Set up the primary auth state listener.
        window.onAuthStateChanged(auth, onAuthChangeCallback);
        console.log(LOG_TAG, 'Auth state listener established.');

        // 2. IMPORTANT: Check for pending redirect result. 
        await window.getGoogleRedirectResult(); 

        console.log(LOG_TAG, 'Redirect result check completed.');
    } catch (error) {
        console.error(LOG_TAG, 'Failed to initialize Auth Paywall:', error);
    }
};


/**
 * Checks for a pending redirect result on page load.
 */
window.getGoogleRedirectResult = () => { // Globally accessible
    try {
        const auth = window.getAuthInstance();
        return firebaseGetRedirectResult(auth);
    } catch (error) {
        console.error(LOG_TAG, 'Failed to get auth instance for redirect check:', error);
        return Promise.reject(error);
    }
};

/**
 * Primary function to initiate Google Sign-In. Implements the essential 
 * Popup-to-Redirect fallback to handle COOP and cancellation errors.
 */
window.signInWithGoogle = () => { // Globally accessible
    const auth = window.getAuthInstance();

    console.log(LOG_TAG, 'Initiating Google sign-in (Popup attempt)...');

    // 1. Attempt signInWithPopup first.
    return signInWithPopup(auth, googleProvider)
        .then(result => {
            console.log(LOG_TAG, 'SUCCESS: Signed in via Popup.');
            return result;
        })
        .catch(error => {
            const isPopupFailure = error.code === 'auth/cancelled-popup-request' ||
                                   error.code === 'auth/popup-blocked';

            if (isPopupFailure) {
                // 2. FALLBACK: Redirect immediately.
                console.warn(LOG_TAG, `Popup failed (Code: ${error.code}). Initiating signInWithRedirect fallback.`);
                
                return signInWithRedirect(auth, googleProvider)
                    .catch(redirectError => {
                        console.error(LOG_TAG, 'FATAL ERROR: signInWithRedirect also failed:', redirectError);
                        throw redirectError;
                    });
            } else {
                console.error(LOG_TAG, 'Google sign-in failed with unexpected error:', error);
                throw error;
            }
        });
};

/**
 * Signs the user out of Firebase.
 */
window.signOutUser = () => { // Globally accessible
    const auth = window.getAuthInstance();
    console.log(LOG_TAG, 'Signing user out.');
    return firebaseSignOut(auth)
        .catch(error => {
            console.error(LOG_TAG, 'Sign out failed:', error);
        });
};
