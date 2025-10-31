// js/config.js
// -----------------------------------------------------------------------------
// Initializes Firebase, Firestore, and Google Analytics (GA4)
// -----------------------------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// -----------------------------------------------------------------------------
// GLOBALS
// -----------------------------------------------------------------------------
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDB = null;

// -----------------------------------------------------------------------------
// INITIALIZE ALL SERVICES
// -----------------------------------------------------------------------------
export async function initializeServices() {
  if (firebaseApp) return { app: firebaseApp, auth: firebaseAuth, db: firebaseDB };

  const cfg = JSON.parse(window.__firebase_config || "{}");
  if (!cfg?.apiKey) throw new Error("[Config] Firebase config missing.");

  // Firebase Core
  firebaseApp = initializeApp(cfg);
  firebaseAuth = getAuth(firebaseApp);
  firebaseDB = getFirestore(firebaseApp);
  console.log("[Config] Firebase initialized.");

  // Google Analytics (GA4)
  if (cfg.measurementId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      dataLayer.push(arguments);
    };
    gtag("js", new Date());
    gtag("config", cfg.measurementId, {
      send_page_view: true,
    });
    console.log("[Config] Google Analytics initialized (GA4).");
  }

  return { app: firebaseApp, auth: firebaseAuth, db: firebaseDB };
}

// -----------------------------------------------------------------------------
// RETURN INITIALIZED CLIENTS
// -----------------------------------------------------------------------------
export function getInitializedClients() {
  if (!firebaseApp) throw new Error("[Config] Firebase not initialized yet.");
  return { app: firebaseApp, auth: firebaseAuth, db: firebaseDB };
}

// -----------------------------------------------------------------------------
// RETURN CURRENT AUTH USER
// -----------------------------------------------------------------------------
export function getAuthUser() {
  const auth = firebaseAuth || getAuth(firebaseApp);
  return auth?.currentUser || null;
}

// -----------------------------------------------------------------------------
// GA4 EVENT LOGGER
// -----------------------------------------------------------------------------
export function logAnalyticsEvent(eventName, params = {}) {
  if (typeof gtag !== "function") {
    console.warn("[GA4] gtag not defined — skipping event:", eventName);
    return;
  }

  try {
    gtag("event", eventName, params);
    console.log(`[GA4] Event logged: ${eventName}`, params);
  } catch (err) {
    console.error("[GA4] Failed to log event:", err);
  }
}

// -----------------------------------------------------------------------------
// EXPORT CORE INSTANCES
// -----------------------------------------------------------------------------
export { firebaseApp, firebaseAuth, firebaseDB };
