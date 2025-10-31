// js/auth-paywall.js
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

// UI overlay called from quiz-engine via UI module
import * as UI from './ui-renderer.js';

const LOG_TAG = "[AUTH-PAYWALL]";
let authInstance = null;
let externalOnAuthChange = null;
let isSigningIn = false;

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

export async function signInWithGoogle() {
  const auth = getAuthInstance();
  if (isSigningIn) return;
  isSigningIn = true;

  // Show professional auth loading overlay
  try {
    UI.showAuthLoading('Opening Google Sign-In — choose your account.');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log(LOG_TAG, "Popup sign-in success:", result.user?.uid);
      UI.hideAuthLoading();
      return result;
    } catch (popupError) {
      const popupFailureCodes = [
        "auth/popup-blocked",
        "auth/cancelled-popup-request",
        "auth/web-storage-unsupported",
      ];
      if (popupFailureCodes.includes(popupError.code)) {
        console.warn(LOG_TAG, "Popup blocked → falling back to redirect.");
        // start redirect flow (this will navigate away)
        await signInWithRedirect(auth, googleProvider);
        // note: redirect will leave page; overlay remains but browser will navigate
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

export function checkAccess() {
  try {
    return !!getAuthInstance().currentUser;
  } catch {
    return false;
  }
}
