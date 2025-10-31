// js/config.js
// -----------------------------------------------------------------------------
// Initializes Firebase, Supabase, and Google Analytics (GA4).
// Exports helpers used by the rest of the app.
// -----------------------------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { createClient as createSupabaseClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/module/supabase.js";

// ---------- internal state ----------
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDB = null;
let supabase = null;
let analyticsInitialized = false;

/**
 * initializeServices()
 * - Initializes Firebase (auth + firestore), Supabase client, and GA4 (if config present).
 * - Safe to call multiple times (idempotent).
 */
export async function initializeServices() {
  if (firebaseApp && supabase) {
    return { app: firebaseApp, auth: firebaseAuth, db: firebaseDB, supabase };
  }

  const cfg = JSON.parse(window.__firebase_config || "{}");

  if (!cfg?.apiKey) {
    throw new Error("Firebase config not found in window.__firebase_config");
  }

  // Initialize Firebase
  firebaseApp = initializeApp(cfg);
  firebaseAuth = getAuth(firebaseApp);
  firebaseDB = getFirestore(firebaseApp);
  console.log("[Config] Firebase initialized.");

  // Initialize Supabase (reads global constants if set)
  // You must include SUPABASE_URL and SUPABASE_ANON_KEY globally (e.g. in js/config.js or separate file).
  // Try both window variables and fallback to cfg.supabase (if you embedded there).
  const SUPABASE_URL = window.SUPABASE_URL || cfg.supabaseUrl || cfg.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || cfg.supabaseAnonKey || cfg.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("[Config] Supabase credentials not found. Supabase client will not be available.");
    supabase = null;
  } else {
    supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("[Config] Supabase client initialized.");
  }

  // Initialize GA4 (gtag) if measurementId present
  if (cfg?.measurementId && typeof window !== "undefined") {
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
 * - Returns the initialized clients. Throws if initializeServices not yet run.
 */
export function getInitializedClients() {
  if (!firebaseApp) throw new Error("Firebase not initialized. Call initializeServices() first.");
  // supabase may be null if credentials missing but return it anyway
  return { app: firebaseApp, auth: firebaseAuth, db: firebaseDB, supabase };
}

/**
 * getAuthUser()
 */
export function getAuthUser() {
  return (firebaseAuth && firebaseAuth.currentUser) || null;
}

/**
 * logAnalyticsEvent(eventName, params)
 * - Safe wrapper around gtag. No-op if GA not configured.
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

// Exports for convenience (modules can import these)
export { firebaseApp, firebaseAuth, firebaseDB, supabase };
