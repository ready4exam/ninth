// js/config.js
// -----------------------------------------------------------------------------
// Initializes Firebase, Supabase, and Google Analytics (GA4).
// Exports helpers used by the rest of the app.
// -----------------------------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------- internal state ----------
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDB = null;
let supabase = null;
let analyticsInitialized = false;

/**
 * initializeServices()
 * Initializes Firebase (auth + firestore), Supabase client, and GA4 (if config present).
 * Safe to call multiple times.
 */
export async function initializeServices() {
  if (firebaseApp && supabase) {
    return { app: firebaseApp, auth: firebaseAuth, db: firebaseDB, supabase };
  }

  const cfg = JSON.parse(window.__firebase_config || "{}");
  if (!cfg?.apiKey) throw new Error("Firebase config not found in window.__firebase_config");

  // ------------------------------
  // Firebase Initialization
  // ------------------------------
  firebaseApp = initializeApp(cfg);
  firebaseAuth = getAuth(firebaseApp);
  firebaseDB = getFirestore(firebaseApp);
  console.log("[Config] Firebase initialized.");

  // ------------------------------
  // Supabase Initialization
  // ------------------------------
  const SUPABASE_URL =
    cfg.supabaseUrl ||
    cfg.SUPABASE_URL ||
    "https://gkyvojcmqsgdynmitcuf.supabase.co";

  const SUPABASE_ANON_KEY =
    cfg.supabaseAnonKey ||
    cfg.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdreXZvamNtcXNnZHlubWl0Y3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDQ0OTcsImV4cCI6MjA3NjMyMDQ5N30.5dn5HbXxQ5sYNECS9o3VxVeyL6I6Z2Yf-nmPwztx1hE";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("[Config] Supabase credentials not found — Supabase client not created.");
    supabase = null;
  } else {
    supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("[Config] Supabase initialized:", SUPABASE_URL);
  }

  // ------------------------------
  // Google Analytics (GA4)
  // ------------------------------
  if (cfg.measurementId && typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", cfg.measurementId, { send_page_view: false });
    analyticsInitialized = true;
    console.log("[Config] Google Analytics (GA4) initialized:", cfg.measurementId);
  }

  return { app: firebaseApp, auth: firebaseAuth, db: firebaseDB, supabase };
}

/**
 * getInitializedClients()
 * Returns initialized clients. Throws if initializeServices not yet run.
 */
export function getInitializedClients() {
  if (!firebaseApp) throw new Error("Firebase not initialized. Call initializeServices() first.");
  return { app: firebaseApp, auth: firebaseAuth, db: firebaseDB, supabase };
}

/**
 * getAuthUser()
 * Returns currently authenticated Firebase user.
 */
export function getAuthUser() {
  return (firebaseAuth && firebaseAuth.currentUser) || null;
}

/**
 * logAnalyticsEvent(eventName, params)
 * Safe wrapper for GA4 logging.
 */
export function logAnalyticsEvent(eventName, params = {}) {
  if (!analyticsInitialized || typeof window.gtag !== "function") {
    console.warn("[Config] gtag not available — event not logged:", eventName);
    return;
  }
  try {
    window.gtag("event", eventName, params);
    console.log("[GA4] Event logged:", eventName, params);
  } catch (err) {
    console.error("[GA4] Failed to log event:", err);
  }
}

// Exports for convenience
export { firebaseApp, firebaseAuth, firebaseDB, supabase };
