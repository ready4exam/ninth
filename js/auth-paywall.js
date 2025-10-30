// js/auth-paywall.js
// -----------------------------------------------------------------------------
// Firebase Authentication for Ready4Exam Quiz Platform.
// Supports popup → redirect fallback, persistent sessions, and external callback.
// -----------------------------------------------------------------------------

import { getInitializedClients } from "./config.js";

import {
  GoogleAuthProvider,
  getRedirectResult as firebaseGetRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const LOG_TAG = "[AUTH-PAYWALL]";
let authInstance = null;
let externalOnAuthChange = null;
let isSigningIn = false;

// -----------------------------------------------------------------------------
// Provider setup
// -----------------------------------------------------------------------------
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Optionally inject clientId from window.__firebase_config
if (window.__firebase_config) {
  try {
    const cfg = JSON.parse(window.__firebase_config);
    if (cfg.clientId) googleProvider.clientId = cfg.clientId;
  } catch (err) {
    console.warn(LOG_TAG, "Could not parse clientId from config.", err);
  }
}

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------
function getAuthInstance() {
  if (!authInstance) {
    try {
      const { auth } = getInitializedClients();
      if (!auth) throw new Error("Auth client not present");
      authInstance = auth;
    } catch (e) {
      console.error(
        LOG_TAG,
        "Auth instance not available. Ensure config.initializeServices() ran.",
        e
      );
      throw e;
    }
  }
  return authInstance;
}

function internalAuthChangeHandler(user) {
  console.log(LOG_TAG, "Auth state changed →", user ? user.uid : "Signed Out");
  if (typeof externalOnAuthChange === "function") {
    try {
      externalOnAuthChange(user);
    } catch (e) {
      console.error(LOG_TAG, "External onAuthChange callback error:", e);
    }
  }
}

// -----------------------------------------------------------------------------
// Initialize listener, restore redirect sessions, set persistence
// -----------------------------------------------------------------------------
export async function initializeAuthListener(onAuthChangeCallback = null) {
  const auth = getAuthInstance();

  // Persist session across reloads
  await setPersistence(auth, browserLocalPersistence);

  // Try restoring redirect result before attaching listener
  try {
    const redirectResult = await firebaseGetRedirectResult(auth);
    if (redirectResult?.user) {
      console.log(LOG_TAG, "Restored user via redirect:", redirectResult.user.uid);
    } else {
      console.log(LOG_TAG, "No redirect result to restore.");
    }
  } catch (error) {
    console.warn(LOG_TAG, "Redirect result error:", error.message);
  }

  if (onAuthChangeCallback && typeof onAuthChangeCallback === "function") {
    externalOnAuthChange = onAuthChangeCallback;
  }

  onAuthStateChanged(auth, internalAuthChangeHandler);
  console.log(LOG_TAG, "Auth listener initialized.");
}

// -----------------------------------------------------------------------------
// Sign-in with Google (Popup → Redirect fallback)
// -----------------------------------------------------------------------------
export async function signInWithGoogle() {
  const auth = getAuthInstance();
  if (isSigningIn) return;
  isSigningIn = true;

  try {
    console.log(LOG_TAG, "Starting Google sign-in (popup)...");
    const result = await signInWithPopup(auth, googleProvider);
    console.log(LOG_TAG, "Popup sign-in success:", result.user?.uid);
    return result;
  } catch (error) {
    const popupFailureCodes = [
      "auth/popup-blocked",
      "auth/cancelled-popup-request",
      "auth/web-storage-unsupported",
    ];
    if (popupFailureCodes.includes(error.code)) {
      console.warn(LOG_TAG, "Popup blocked → using redirect flow.");
      await signInWithRedirect(auth, googleProvider);
    } else {
      console.error(LOG_TAG, "Sign-in failed:", error);
      throw error;
    }
  } finally {
    isSigningIn = false;
  }
}

// -----------------------------------------------------------------------------
// Sign-out
// -----------------------------------------------------------------------------
export async function signOut() {
  const auth = getAuthInstance();
  try {
    await firebaseSignOut(auth);
    console.log(LOG_TAG, "User signed out successfully.");
  } catch (error) {
    console.error(LOG_TAG, "Sign-out failed:", error);
    throw error;
  }
}

export const signOutUser = signOut;

// -----------------------------------------------------------------------------
// Simple access check
// -----------------------------------------------------------------------------
export function checkAccess() {
  try {
    return !!getAuthInstance().currentUser;
  } catch {
    return false;
  }
}
