// js/auth-paywall.js
// Handles Firebase Authentication, user state, and Razorpay Paywall logic.
import { getInitializedClients } from './config.js'; // Import the safe client getter

// Define a placeholder for the application ID for Firestore paths (optional for now)
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

    auth.onAuthStateChanged((user) => {
        currentAuthUser = user;
        // The callback updates UI/runs subsequent logic based on the user object
        onAuthStateChangedCallback(user);
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
        // Use signInWithPopup for a non-breaking flow
        const result = await auth.signInWithPopup(provider);
        console.log("[AUTH] Google Sign-In successful:", result.user.email);
        return result.user;
    } catch (error) {
        console.error("[AUTH ERROR] Google Sign-In failed:", error);
        // Handle popup closed or other specific errors
        throw error;
    }
}

/**
 * Initiates Firebase Sign-Out.
 */
export async function signOut() {
    const { auth } = getInitializedClients();
    if (!auth) {
        throw new Error("Firebase Auth not available.");
    }
    try {
        await auth.signOut();
        console.log("[AUTH] User signed out.");
    } catch (error) {
        console.error("[AUTH ERROR] Sign-out failed:", error);
    }
}

/**
 * Checks the user's premium payment status in Firestore.
 * NOTE: This is an ASYNC function because it queries the database.
 * @returns {Promise<boolean>} - True if premium access is granted, false otherwise.
 */
export async function checkPaymentStatus() {
    // If the user is not logged in, they cannot have premium access.
    if (!currentAuthUser) {
        console.log("[PAYWALL] No authenticated user. Access denied.");
        return false;
    }

    const { db } = getInitializedClients();
    if (!db) {
        console.error("[PAYWALL] Firestore client is not initialized.");
        return false;
    }

    const userId = currentAuthUser.uid;
    const accessDocPath = `artifacts/${APP_ID}/users/${userId}/access_status/premium`;

    try {
        // Check for the access status document
        const docRef = db.doc(accessDocPath);
        const docSnap = await docRef.get();

        if (docSnap.exists && docSnap.data().is_premium === true) {
            console.log(`[PAYWALL] Premium access granted for user ${userId}.`);
            return true;
        } else {
            console.log(`[PAYWALL] Premium access document not found or status is false for user ${userId}.`);
            return false;
        }

    } catch (e) {
        console.error("[PAYWALL ERROR] Failed to check access status:", e);
        // Fail-safe: If there's an error, assume no access to be safe.
        return false;
    }
}

// ... Razorpay logic and grantAccess function (keeping existing logic below for context, though Razorpay is not exported)

/**
 * Initiates the Razorpay payment flow.
 * NOTE: This requires Razorpay CDN to be loaded.
 * @param {string} topic - The topic the user is paying for.
 */
export function initiatePayment(topic) {
    if (!window.Razorpay) {
        console.error("Razorpay SDK not loaded.");
        return;
    }

    if (!currentAuthUser) {
        console.error("User must be logged in to initiate payment.");
        // In a real app, you'd prompt login here.
        return;
    }

    const options = {
        key: 'rzp_test_YourTestKey', // Replace with your actual Test Key
        amount: 50000, // Amount in smallest currency unit (e.g., 50000 = ₹500.00)
        currency: 'INR',
        name: 'Ready4Exam',
        description: `Premium Access for ${topic}`,
        image: 'https://placehold.co/100x100/1a3e6a/ffffff?text=R4E',
        handler: async function (response) {
            // Success handler
            await grantAccess(currentAuthUser.uid, topic, response.razorpay_payment_id);
            // DO NOT use alert()
            console.log(`Payment successful! ID: ${response.razorpay_payment_id}. Access granted!`);
            // Reload the page or the quiz to apply access
            window.location.reload();
        },
        prefill: {
            name: currentAuthUser.displayName || 'Learner',
            email: currentAuthUser.email || 'guest@example.com'
        },
        theme: {
            color: '#1a3e6a'
        },
        modal: {
            // Ensure the modal works correctly with the sign-in pop-up, if necessary
            ondismiss: function() {
                console.log("Payment modal closed without completing.");
            }
        }
    };

    // The entire options object is passed into the options object. This is a simplified demo.
    const rzp1 = new Razorpay(options);
    rzp1.open();
}

/**
 * Records successful payment and grants 'premium' access in Firestore.
 * @param {string} userId
 * @param {string} topic
 * @param {string} paymentId
 */
async function grantAccess(userId, topic, paymentId) {
    const { db } = getInitializedClients();
    if (!db || !userId) return;

    try {
        // 1. Log the payment event
        const paymentCollectionPath = `artifacts/${APP_ID}/users/${userId}/payment_history`;
        await db.collection(paymentCollectionPath).add({
            topic: topic,
            amount: 500,
            currency: 'INR',
            paymentId: paymentId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Grant the 'premium' access status for this topic (or globally)
        const accessDocPath = `artifacts/${APP_ID}/users/${userId}/access_status/premium`;
        await db.doc(accessDocPath).set({
            is_premium: true,
            granted_on: firebase.firestore.FieldValue.serverTimestamp(),
            granted_by: paymentId
        }, { merge: true });

        console.log(`[PAYWALL] Access granted for user ${userId} via payment ${paymentId}.`);

    } catch (e) {
        console.error("[PAYWALL ERROR] Failed to record access grant in Firestore:", e);
    }
}

// Expose the current user function
export function getCurrentUser() {
    return currentAuthUser;
}

// The following functions are also exported in the existing file, so they must be kept for compatibility
export { signInWithGoogle, signOut, initiatePayment };
