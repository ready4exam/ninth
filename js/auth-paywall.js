// js/auth-paywall.js
// -----------------------------------------------------------------------------
// Handles Google Sign-In, Auth State, and Paywall Control
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

import * as UI from "./ui-renderer.js";

const LOG_TAG = "[AUTH-PAYWALL]";
let authInstance = null;
let externalOnAuthChange = null;
let isSigningIn = false;

// -----------------------------------------------------------------------------
// Google Auth Provider Setup
// -----------------------------------------------------------------------------
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

if (window.__firebase_config) {
  try {
    const cfg = JSON.parse(window.__firebase_config);
    if (cfg.clientId) googleProvider.clientId = cfg.clientId;
  } catch (err) {
    console.warn(LOG_TAG, "Could not parse clientId from config.", err);
  }
}

// -----------------------------------------------------------------------------
// Auth Client Getter
// -----------------------------------------------------------------------------
function getAuthInstance() {
  if (!authInstance) {
    try {
      const { auth } = getInitializedClients();
      if (!auth) throw new Error("Auth client not present");
      authInstance = auth;
    } catch (e) {
      console.error(LOG_TAG, "Auth instance not available. Ensure config.initializeServices() ran.", e);
      throw e;
    }
  }
  return authInstance;
}

// -----------------------------------------------------------------------------
// Internal Auth State Handler
// -----------------------------------------------------------------------------
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
// Initialize Auth Listener
// -----------------------------------------------------------------------------
export async function initializeAuthListener(onAuthChangeCallback = null) {
  const auth = getAuthInstance();

  // persist session
  await setPersistence(auth, browserLocalPersistence);

  // try restore redirect result
  try {
    const redirectResult = await firebaseGetRedirectResult(auth);
    if (redirectResult?.user) {
      console.log(LOG_TAG, "Restored user via redirect:", redirectResult.user.uid);
    } else {
      console.log(LOG_TAG, "No redirect result to restore.");
    }
  } catch (error) {
    console.warn(LOG_TAG, "Redirect result error:", error.message || error);
  }

  if (onAuthChangeCallback && typeof onAuthChangeCallback === "function") {
    externalOnAuthChange = onAuthChangeCallback;
  }

  onAuthStateChanged(auth, internalAuthChangeHandler);
  console.log(LOG_TAG, "Auth listener initialized.");
}

// -----------------------------------------------------------------------------
// Google Sign-In Flow
// -----------------------------------------------------------------------------
export async function signInWithGoogle() {
  const auth = getAuthInstance();
  if (isSigningIn) return;
  isSigningIn = true;

  // Professional overlay during sign-in
  try {
    UI.showAuthLoading("Opening Google Sign-In — choose your account.");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log(LOG_TAG, "Popup sign-in success:", result.user?.uid);
      UI.hideAuthLoading();

      // ✅ Hide paywall and show quiz after sign-in
      const paywall = document.getElementById("paywall-screen");
      const quizContent = document.getElementById("quiz-content");
      if (paywall) paywall.classList.add("hidden");
      if (quizContent) quizContent.classList.remove("hidden");

      // Notify quiz-engine listener that user is signed in
      document.dispatchEvent(new CustomEvent("userSignedIn", { detail: result.user }));

      return result;
    } catch (popupError) {
      const popupFailureCodes = [
        "auth/popup-blocked",
        "auth/cancelled-popup-request",
        "auth/web-storage-unsupported",
      ];
      if (popupFailureCodes.includes(popupError.code)) {
        console.warn(LOG_TAG, "Popup blocked → falling back to redirect.");
        await signInWithRedirect(auth, googleProvider);
      } else {
        console.error(LOG_TAG, "Popup error:", popupError);
        UI.hideAuthLoading();
        throw popupError;
      }
    }
  } finally {
    isSigningIn = false;
  }
}

// -----------------------------------------------------------------------------
// Sign-Out Flow
// -----------------------------------------------------------------------------
export async function signOut() {
  const auth = getAuthInstance();
  try {
    await firebaseSignOut(auth);
    console.log(LOG_TAG, "User signed out successfully.");

    // Show paywall again when signed out
    const paywall = document.getElementById("paywall-screen");
    const quizContent = document.getElementById("quiz-content");
    if (paywall) paywall.classList.remove("hidden");
    if (quizContent) quizContent.classList.add("hidden");
  } catch (error) {
    console.error(LOG_TAG, "Sign-out failed:", error);
    throw error;
  }
}

export const signOutUser = signOut;

// -----------------------------------------------------------------------------
// Access Check
// -----------------------------------------------------------------------------
export function checkAccess() {
  try {
    return !!getAuthInstance().currentUser;
  } catch {
    return false;
  }
}
