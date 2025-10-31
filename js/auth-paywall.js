// js/auth-paywall.js
// -----------------------------------------------------------------------------
// Firebase Authentication (Google Sign-In + Session Persistence)
// -----------------------------------------------------------------------------

import { getInitializedClients } from "./config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const LOG = "[AUTH-PAYWALL]";
let authInstance = null;
let externalCallback = null;
let isSigningIn = false;

/**
 * Get or initialize Firebase Auth instance
 */
function getAuthInstance() {
  if (!authInstance) {
    const { auth } = getInitializedClients();
    if (!auth) throw new Error("[AUTH] Firebase Auth not initialized.");
    authInstance = auth;
  }
  return authInstance;
}

/**
 * Initialize authentication listener
 */
export async function initializeAuthListener(callback) {
  const auth = getAuthInstance();
  await setPersistence(auth, browserLocalPersistence);

  try {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      console.log(LOG, "Restored user via redirect:", redirectResult.user.uid);
    }
  } catch (err) {
    console.warn(LOG, "Redirect restore failed:", err.message);
  }

  if (typeof callback === "function") externalCallback = callback;

  onAuthStateChanged(auth, (user) => {
    console.log(LOG, "Auth state changed →", user ? user.uid : "Signed Out");
    if (externalCallback) externalCallback(user);
  });

  console.log(LOG, "Auth listener initialized.");
}

/**
 * Sign in with Google (Popup → Redirect fallback)
 */
export async function signInWithGoogle() {
  const auth = getAuthInstance();
  if (isSigningIn) return;
  isSigningIn = true;

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await signInWithPopup(auth, provider);
    console.log(LOG, "Popup sign-in success:", result.user?.email);
    return result;
  } catch (error) {
    const popupBlocked = [
      "auth/popup-blocked",
      "auth/cancelled-popup-request",
      "auth/web-storage-unsupported",
    ];
    if (popupBlocked.includes(error.code)) {
      console.warn(LOG, "Popup blocked → redirect fallback.");
      await signInWithRedirect(auth, provider);
    } else {
      console.error(LOG, "Sign-in failed:", error);
    }
  } finally {
    isSigningIn = false;
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  const auth = getAuthInstance();
  try {
    await firebaseSignOut(auth);
    console.log(LOG, "User signed out successfully.");
  } catch (err) {
    console.error(LOG, "Sign-out failed:", err);
  }
}

/**
 * Check whether user is logged in
 */
export function checkAccess() {
  try {
    return !!getAuthInstance().currentUser;
  } catch {
    return false;
  }
}
