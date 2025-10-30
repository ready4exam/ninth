// js/config.js
// -----------------------------------------------------------------------------
// Centralized configuration and initialization for all services
// (Firebase, Firestore, Auth, Supabase)
// -----------------------------------------------------------------------------

// --- Mandatory Global Variables ---
// These must be defined in <script> before this module loads (quiz-engine.html)
const firebaseConfig =
  typeof __firebase_config !== "undefined" ? JSON.parse(__firebase_config) : {};
const initialAuthToken =
  typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

// --- Firebase Imports ---
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut as firebaseSignOut,
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

// --- Supabase Config (LIVE CREDENTIALS) ---
const SUPABASE_URL = "https://gkyvojcmqsgdynmitcuf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdreXZvamNtcXNnZHlubWl0Y3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDQ0OTcsImV4cCI6MjA3NjMyMDQ5N30.5dn5HbXxQ5sYNECS9o3VxVeyL6I6Z2Yf-nmPwztx1hE";

/**
 * Initializes Firebase + Firestore + Supabase
 */
export async function initializeServices() {
  if (isInitialized) {
    console.warn("[CONFIG] Services already initialized.");
    return;
  }

  // 1️⃣ Validate Config
  if (Object.keys(firebaseConfig).length === 0) {
    console.error("[CONFIG ERROR] Firebase config is empty. Cannot initialize.");
    throw new Error("Missing Firebase configuration.");
  }

  // 2️⃣ Initialize Firebase App safely
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  console.log("[CONFIG] Firebase app, Auth, and Firestore initialized.");

  // 3️⃣ Initialize Supabase
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("[CONFIG] Supabase client initialized.");

  // 4️⃣ Try signing in with custom token (optional)
  try {
    if (initialAuthToken) {
      await signInWithCustomToken(auth, initialAuthToken);
      console.log("[CONFIG] Signed in with custom token.");
    }
  } catch (error) {
    console.warn(
      "[CONFIG WARNING] Custom token sign-in failed. Falling back to Google Sign-In.",
      error
    );
  }

  isInitialized = true;
  console.log("[CONFIG] All services initialized successfully.");
}

/**
 * Retrieve initialized clients (for auth-paywall.js)
 */
export function getInitializedClients() {
  if (!isInitialized) {
    console.error("[CONFIG ERROR] Tried to get clients before init.");
    throw new Error("Core services must be initialized first.");
  }
  return { supabase, db, auth };
}

/**
 * Retrieve currently authenticated Firebase user
 */
export function getAuthUser() {
  return auth ? auth.currentUser : null;
}

/**
 * Firebase Sign-Out wrapper
 */
export const signOutUser = firebaseSignOut;
