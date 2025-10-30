/**
 * Firebase Auth Paywall Logic - auth-paywall.js
 * * NOTE: This code assumes that the Firebase SDK (App and Auth) has been 
 * initialized and is available globally (e.g., via a <script> tag loading 
 * firebase-app.js and firebase-auth.js). 
 * * You must ensure that 'auth' and 'googleProvider' are correctly initialized 
 * and exposed by your config.js before this script runs.
 */

// --- GLOBAL REFERENCES (Assumed to be initialized in config.js) ---
// For this code to run smoothly, ensure these variables are defined globally 
// or imported from config.js before execution:
// const auth = firebase.auth();
// const googleProvider = new firebase.auth.GoogleAuthProvider();

const LOG_TAG = '[AUTH-PAYWALL]';

/**
 * Placeholder for the function in quiz-engine.js that should run when 
 * the authentication state changes (i.e., when a user signs in or out).
 * @param {firebase.User|null} user - The current authenticated user object or null.
 */
function onAuthChangeCallback(user) {
    // IMPORTANT: You must replace this placeholder with the actual function 
    // from quiz-engine.js that handles user sign-in/out and loads the quiz.
    console.log(LOG_TAG, 'Placeholder: Auth state changed. User ID:', user ? user.uid : 'Signed Out');
    
    // Example: If your quiz-engine.js has a function called loadQuizEngine(user), 
    // you would call it here:
    // if (user) { 
    //     loadQuizEngine(user); 
    // } else {
    //     displaySignInUI();
    // }

    // Your logs suggest a function called 'onAuthChange' in quiz-engine.js
    // If that function is globally available or imported, call it:
    // if (typeof onAuthChange === 'function') {
    //    onAuthChange(user); 
    // }
}


/**
 * Primary function to initiate Google Sign-In. Implements the essential 
 * Popup-to-Redirect fallback to handle COOP and cancellation errors.
 * This should be attached to your "Sign in with Google" button.
 */
function signInWithGoogle() {
    console.log(LOG_TAG, 'Initiating Google sign-in (Popup attempt)...');

    // 1. Attempt signInWithPopup first.
    return auth.signInWithPopup(googleProvider)
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
                // Execution stops here. The redirect result will be handled 
                // by the initializeAuthListener function on the next page load.
                return auth.signInWithRedirect(googleProvider)
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
 * Initializes the Firebase Auth listener and checks for a pending redirect result.
 * This function MUST be called once when the application loads.
 */
function initializeAuthListener() {
    // 1. Set up the primary auth state listener.
    firebase.auth().onAuthStateChanged(onAuthChangeCallback);
    console.log(LOG_TAG, 'Auth state listener established.');

    // 2. IMPORTANT: Check for pending redirect result. 
    // This resolves the user sign-in if the previous attempt ended in a redirect (the fallback).
    firebase.auth().getRedirectResult()
        .then((result) => {
            if (result.credential) {
                console.log(LOG_TAG, 'REDIRECT SUCCESS: Successfully resolved user credential.');
            }
        })
        .catch((error) => {
            // Log any errors that occurred during the redirect result check
            console.error(LOG_TAG, 'Redirect result check error:', error);
        });

    console.log(LOG_TAG, 'Redirect result check completed.');
}

// --- MODULE EXPORTS (Ensure these are available globally or imported) ---

// Assuming your quiz-engine.js and other files rely on these being global:
window.signInWithGoogle = signInWithGoogle;
window.initializeAuthListener = initializeAuthListener;
window.onAuthChangeCallback = onAuthChangeCallback; // Expose the callback for debugging/integration
