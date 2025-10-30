// js/auth-paywall.js
// AUTH module — fixed to accept external onAuthChange callback and to export signOut
// Uses Firebase Modular SDK as before.

import { getInitializedClients } from './config.js';

import {
    GoogleAuthProvider,
    getRedirectResult as firebaseGetRedirectResult,
    signInWithPopup,
    signInWithRedirect,
    onAuthStateChanged,
    signOut as firebaseSignOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const LOG_TAG = '[AUTH-PAYWALL-FIX]';

let authInstance = null;
const googleProvider = new GoogleAuthProvider();
// Explicitly bind your Web Client ID (from Firebase console > Authentication > Sign-in method > Google)
googleProvider.setCustomParameters({
    prompt: "select_account",
});

// Optional but safer: If your Firebase config object contains the clientId
// (you can add it under window.__firebase_config.clientId), then set it here
if (window.__firebase_config) {
    try {
        const cfg = JSON.parse(window.__firebase_config);
        if (cfg.clientId) googleProvider.clientId = cfg.clientId;
    } catch (err) {
        console.warn("[AUTH-PAYWALL] Unable to parse clientId from config.", err);
    }
}

// Module-level callback that quiz-engine will pass in via initializeAuthListener(callback)
let externalOnAuthChange = null;

/**
 * Internal helper to retrieve the initialized Firebase Auth instance.
 */
const getAuthInstance = () => {
    if (!authInstance) {
        try {
            const clients = getInitializedClients();
            authInstance = clients.auth;
            if (!authInstance) throw new Error("Auth client not present");
        } catch (e) {
            console.error(LOG_TAG, "Auth instance not available. Ensure services are initialized in config.js.", e);
            throw e;
        }
    }
    return authInstance;
};

/**
 * Default internal auth-change handler (used if no external callback passed).
 * It logs and proxies to any external callback if set.
 */
const internalAuthChangeHandler = (user) => {
    console.log(LOG_TAG, 'Auth state changed. User ID:', user ? user.uid : 'Signed Out');
    // If an external callback was provided by the app, call it.
    if (typeof externalOnAuthChange === 'function') {
        try {
            externalOnAuthChange(user);
        } catch (e) {
            console.error(LOG_TAG, 'External onAuthChange callback threw an error:', e);
        }
    }
};

/**
 * Checks if a user is currently signed in. Accepts optional topic parameter
 * for API compatibility with quiz-engine.js which passes the topic.
 * @param {string} [_topic]
 * @returns {boolean}
 */
const checkAccess = (_topic) => {
    try {
        return !!getAuthInstance().currentUser;
    } catch (e) {
        return false;
    }
};

/**
 * Initializes the Auth components and sets up listeners.
 * Accepts an optional callback: function(user) -> void
 * This callback will be called on every auth state change (matching quiz-engine.js expectation).
 */
const initializeAuthListener = async (onAuthChangeCallback = null) => {
    try {
        // Store external callback so internal handler can call it
        if (onAuthChangeCallback && typeof onAuthChangeCallback === 'function') {
            externalOnAuthChange = onAuthChangeCallback;
        }

        const auth = getAuthInstance();

        // 1. Primary auth state listener: uses the internal handler which forwards to external callback.
        onAuthStateChanged(auth, internalAuthChangeHandler);
        console.log(LOG_TAG, 'Auth state listener established.');

        // 2. Check for redirect result in case a redirect flow completed
        await getGoogleRedirectResult();

        console.log(LOG_TAG, 'Redirect result check completed.');
    } catch (error) {
        console.error(LOG_TAG, 'Failed to initialize Auth Listener:', error);
        throw error;
    }
};

/**
 * Checks for a pending redirect result on page load.
 * Returns the firebase redirect result Promise (or rejects).
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
 * Primary function to initiate Google Sign-In. Implements Popup -> Redirect fallback.
 */
const signInWithGoogle = () => {
    const auth = getAuthInstance();

    console.log(LOG_TAG, 'Initiating Google sign-in (Popup attempt)...');

    return signInWithPopup(auth, googleProvider)
        .then(result => {
            console.log(LOG_TAG, 'SUCCESS: Signed in via Popup.');
            return result;
        })
        .catch(error => {
            const isPopupFailure = error.code === 'auth/cancelled-popup-request' ||
                                   error.code === 'auth/popup-blocked' ||
                                   error.code === 'auth/web-storage-unsupported';

            if (isPopupFailure) {
                console.warn(LOG_TAG, `Popup failed (Code: ${error.code}). Initiating signInWithRedirect fallback.`);
                // start redirect; this reloads the page
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
const signOut = () => {
    const auth = getAuthInstance();
    console.log(LOG_TAG, 'Signing user out.');
    return firebaseSignOut(auth)
        .catch(error => {
            console.error(LOG_TAG, 'Sign out failed:', error);
            throw error;
        });
};

// Keep backward-compatible named export
const signOutUser = signOut;

// EXPORTS
export {
    signInWithGoogle,
    getGoogleRedirectResult,
    initializeAuthListener,
    checkAccess,
    signOut,
    signOutUser
};
