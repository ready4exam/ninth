// js/config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";

let app, auth, db, analytics, currentUser;

export function initializeServices() {
  if (app) return { app, auth, db, analytics };

  const firebaseConfig = JSON.parse(window.__firebase_config || "{}");
  if (!firebaseConfig.projectId) throw new Error("Firebase config missing.");

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  try {
    analytics = getAnalytics(app);
    console.log("[Config] Google Analytics initialized.");
  } catch (e) {
    console.warn("[Config] Analytics not supported in this environment.", e);
  }

  onAuthStateChanged(auth, (user) => {
    currentUser = user || null;
  });

  console.log("[Config] Firebase initialized.");
  return { app, auth, db, analytics };
}

export function getInitializedClients() {
  if (!app || !db || !auth) initializeServices();
  return { app, auth, db, analytics };
}

export function getAuthUser() {
  return currentUser;
}

export function logAnalyticsEvent(eventName, data = {}) {
  if (!analytics) return;
  try {
    logEvent(analytics, eventName, data);
  } catch (err) {
    console.warn("[Analytics] logEvent failed:", err);
  }
}
