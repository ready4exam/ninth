// js/config.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.4/+esm";

let firebaseApp = null, db = null, auth = null, supabase = null, isInitialized = false;

const firebaseConfig =
  typeof __firebase_config !== "undefined" ? JSON.parse(__firebase_config) : {};
const initialAuthToken =
  typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

const SUPABASE_URL = "https://gkyvojcmqsgdynmitcuf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdreXZvamNtcXNnZHlubWl0Y3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDQ0OTcsImV4cCI6MjA3NjMyMDQ5N30.5dn5HbXxQ5sYNECS9o3VxVeyL6I6Z2Yf-nmPwztx1hE";

export async function initializeServices() {
  if (isInitialized) return;
  if (Object.keys(firebaseConfig).length === 0) throw new Error("Missing Firebase config.");

  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("[CONFIG] Firebase initialized successfully.");
  console.log("[CONFIG] Supabase client ready.");

  try {
    if (initialAuthToken) {
      await signInWithCustomToken(auth, initialAuthToken);
      console.log("[CONFIG] Signed in with custom token.");
    }
  } catch (e) {
    console.warn("[CONFIG] Custom token sign-in skipped:", e.message);
  }

  isInitialized = true;
  console.log("[CONFIG] All core services initialized.");
}

export function getInitializedClients() {
  if (!isInitialized) throw new Error("Core services not initialized.");
  return { supabase, db, auth };
}
export function getAuthUser() { return auth ? auth.currentUser : null; }
