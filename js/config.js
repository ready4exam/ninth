// js/config.js
// -----------------------------------------------------------------------------
// Centralized configuration for Supabase, Firebase, and Google Analytics (GA4)
// -----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// -----------------------------------------------------------------------------
// 🔹 Supabase Configuration
// -----------------------------------------------------------------------------
const SUPABASE_URL = "https://gkyvojcmqsgdynmitcuf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdreXZvamNtcXNnZHlubWl0Y3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDQ0OTcsImV4cCI6MjA3NjMyMDQ5N30.5dn5HbXxQ5sYNECS9o3VxVeyL6I6Z2Yf-nmPwztx1hE";

// -----------------------------------------------------------------------------
// 🔹 Firebase Configuration (from quiz-signon project)
// -----------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAXdKiYRxBKAj280YcNuNwlKKDp85xpOWQ",
  authDomain: "quiz-signon.firebaseapp.com",
  projectId: "quiz-signon",
  storageBucket: "quiz-signon.firebasestorage.app",
  messagingSenderId: "863414222321",
  appId: "1:863414222321:web:819f5564825308bcd9d850",
  measurementId: "G-4EFDM0CRYY",
};

// -----------------------------------------------------------------------------
// 🔹 Initialize Supabase + Firebase + Firestore + Auth
// -----------------------------------------------------------------------------
let supabaseClient = null;
let firebaseApp = null;
let firebaseAuth = null;
let firestoreDB = null;
let initialized = false;

export async function initializeServices() {
  if (initialized) return;

  // Supabase
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("[Config] Supabase initialized.");

  // Firebase
  firebaseApp = initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);
  firestoreDB = getFirestore(firebaseApp);
  console.log("[Config] Firebase initialized.");

  // GA4 setup
  if (firebaseConfig.measurementId && !window.gtag) {
    const gtagScript = document.createElement("script");
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${firebaseConfig.measurementId}`;
    gtagScript.async = true;
    document.head.appendChild(gtagScript);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      dataLayer.push(arguments);
    };
    gtag("js", new Date());
    gtag("config", firebaseConfig.measurementId);
    console.log("[Config] Google Analytics initialized.");
  }

  initialized = true;
}

// -----------------------------------------------------------------------------
// 🔹 Return initialized clients
// -----------------------------------------------------------------------------
export function getInitializedClients() {
  if (!supabaseClient || !firebaseApp || !firebaseAuth || !firestoreDB) {
    throw new Error("Core services not initialized.");
  }
  return {
    supabase: supabaseClient,
    auth: firebaseAuth,
    db: firestoreDB,
  };
}

// -----------------------------------------------------------------------------
// 🔹 Auth helpers
// -----------------------------------------------------------------------------
export function getAuthUser() {
  const auth = firebaseAuth;
  return auth?.currentUser || null;
}

export function observeAuthChanges(callback) {
  const auth = firebaseAuth;
  if (auth) onAuthStateChanged(auth, callback);
}
