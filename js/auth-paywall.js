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
        const result = await auth.signInWithPopup(provider);
        console.log("[AUTH] Google Sign-In successful:", result.user.email);
        return result.user;
    } catch (error) {
        console.error("[AUTH ERROR] Google Sign-In failed:", error);
        throw error;
    }
}

/**
 * Logs out the current user.
 */
export async function signOut() {
    const { auth } = getInitializedClients();
    if (!auth) return;
    try {
        await auth.signOut();
        console.log("[AUTH] User signed out.");
    } catch (error) {
        console.error("[AUTH ERROR] Sign out failed:", error);
    }
}

/**
 * Checks if the current user has paid for the required topic/access.
 * This is a simulated check using Firestore data.
 * In a real app, this would check a dedicated 'payments' collection.
 * @param {string} topic - The topic the user is trying to access.
 * @returns {Promise<boolean>} - True if payment is confirmed, false otherwise.
 */
export async function checkPaymentStatus(topic) {
    if (!currentAuthUser) {
        console.log("[PAYWALL] User not logged in, paywall required.");
        return false;
    }

    const { db } = getInitializedClients();
    if (!db) {
         console.error("[PAYWALL ERROR] Firestore DB not available.");
         return false;
    }

    try {
        // Check if user is a 'premium' user (placeholder logic)
        // Check Firestore Path: /artifacts/{APP_ID}/users/{userId}/access_status/premium
        const docPath = `artifacts/${APP_ID}/users/${currentAuthUser.uid}/access_status/premium`;
        const docRef = db.doc(docPath);
        const docSnap = await docRef.get();

        if (docSnap.exists && docSnap.data().is_premium === true) {
            console.log("[PAYWALL] Premium access granted.");
            return true;
        }

        console.log("[PAYWALL] User logged in but no premium status found. Paywall active.");
        return false; // Paywall required
        
    } catch (e) {
        console.error("[PAYWALL ERROR] Error checking payment status:", e);
        // Fail safe: assume payment is required if check fails
        return false; 
    }
}

/**
 * Initiates the Razorpay payment process.
 * This is highly simplified and assumes Razorpay is loaded via CDN.
 * @param {string} topic - The item being purchased.
 */
export function initiateRazorpayPayment(topic) {
    if (typeof Razorpay === 'undefined') {
        console.error("[PAYMENT ERROR] Razorpay script not loaded.");
        return;
    }
    if (!currentAuthUser) {
         console.error("[PAYMENT ERROR] Must be logged in to pay.");
         return;
    }

    // --- RAZORPAY CONFIGURATION (MOCK/PLACEHOLDER) ---
    const options = {
        key: "rzp_test_YOUR_KEY", // Replace with your actual key in production
        amount: 50000, // Amount in paise (e.g., 50000 paise = 500 INR)
        currency: "INR",
        name: "Ready4Exam",
        description: `Access Pass for ${topic} Quizzes`,
        image: "favicon.png", // Use the app favicon
        order_id: "", // Dynamically generated order ID from your server (Omitted for this client-side demo)
        handler: async function (response) {
            // Success handler: Update Firestore access record
            await grantAccess(currentAuthUser.uid, topic, response.razorpay_payment_id);
            // Reload the page to confirm access
            window.location.reload(); 
        },
        prefill: {
            name: currentAuthUser.displayName || "Student",
            email: currentAuthUser.email || "",
            contact: "9999999999" // Placeholder contact number
        },
        theme: {
            color: "#1a3e6a" // CBSE Blue
        }
    };

    // For a real application, you must first create an order on your server
    // and pass the order_id into the options object. This is a simplified demo.
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
