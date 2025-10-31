// js/config.js
// -----------------------------------------------------------------------------
// Unified Firebase + Firestore + Supabase configuration
// -----------------------------------------------------------------------------

const firebaseConfig =
  typeof __firebase_config !== "undefined" ? JSON.parse(__firebase_config) : {};
const initialAuthToken =
  typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

// --- Firebase Imports ---
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInWithCustomToken,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Supabase Imports ---
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.4/+esm";

// --- Internal State ---
let firebaseApp = null;
let db = null;
let auth = null;
let supabase = null;
let isInitialized = false;
let initializePromise = null;

// --- Supabase Config (LIVE CREDENTIALS) ---
const SUPABASE_URL = "https://gkyvojcmqsgdynmitcuf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdreXZvamNtcXNnZHlubWl0Y3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDQ0OTcsImV4cCI6MjA3NjMyMDQ5N30.5dn5HbXxQ5sYNECS9o3VxVeyL6I6Z2Yf-nmPwztx1hE";

/**
 * Initialize all services (Firebase, Firestore, Supabase)
 */
export async function initializeServices() {
  if (isInitialized) return;
  if (initializePromise) return initializePromise;

  initializePromise = (async () => {
    if (Object.keys(firebaseConfig).length === 0) {
      throw new Error("[CONFIG] Firebase configuration missing.");
    }

    // Firebase App + Services
    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    console.log("[CONFIG] Firebase initialized successfully.");

    // Supabase
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("[CONFIG] Supabase client ready.");

    // Optional: Login via custom token (if provided)
    if (initialAuthToken) {
      try {
        await signInWithCustomToken(auth, initialAuthToken);
        console.log("[CONFIG] Signed in using custom token.");
      } catch (e) {
        console.warn("[CONFIG] Token sign-in failed → continuing normally.", e);
      }
    }

    isInitialized = true;
    console.log("[CONFIG] All core services initialized.");
  })();

  return initializePromise;
}

/**
 * Return initialized clients
 */
export function getInitializedClients() {
  if (!isInitialized) throw new Error("[CONFIG] Core services not initialized yet.");
  return { supabase, db, auth };
}

/**
 * Get current Firebase user
 */
export function getAuthUser() {
  return auth ? auth.currentUser : null;
}

/**
 * Firebase sign-out export
 */
import { signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
export const signOutUser = firebaseSignOut;
