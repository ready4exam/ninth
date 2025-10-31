// js/auth-paywall.js
import { getInitializedClients } from "./config.js";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const LOG = "[AUTH-PAYWALL]";
let auth = null;
let externalCb = null;

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

function getAuth() {
  if (!auth) {
    const { auth: a } = getInitializedClients();
    auth = a;
  }
  return auth;
}

export async function initializeAuthListener(cb) {
  const a = getAuth();
  await setPersistence(a, browserLocalPersistence);
  try { await getRedirectResult(a); } catch {}
  if (cb) externalCb = cb;
  onAuthStateChanged(a, (user) => {
    console.log(LOG, "Auth state changed →", user ? user.uid : "Signed Out");
    if (externalCb) externalCb(user);
  });
  console.log(LOG, "Auth listener initialized.");
}

export async function signInWithGoogle() {
  const a = getAuth();
  try {
    console.log(LOG, "Starting Google sign-in (popup)...");
    const res = await signInWithPopup(a, provider);
    return res;
  } catch (e) {
    console.warn(LOG, "Popup failed, redirecting...");
    await signInWithRedirect(a, provider);
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(getAuth());
    console.log(LOG, "User signed out successfully.");
  } catch (e) {
    console.error(LOG, "Sign-out failed:", e);
  }
}

export function checkAccess() {
  try { return !!getAuth().currentUser; } catch { return false; }
}
