// config.js

// --- Supabase Configuration (Already defined globally in the HTML or earlier in this file) ---
window.SUPABASE_URL =  // Example: 'https://xyz123.supabase.co'
window.SUPABASE_ANON_KEY = ''

// js/config.js
// Global Configuration File for Firebase and Supabase Clients

// --- 1. FIREBASE CONFIGURATION (Extracted from old science.html) ---
// Note: This uses the legacy 'compat' API due to the loading method in the template.
const firebaseConfig = {
    apiKey: "AIzaSyAXdKiYRxBKAj280YcNuNwlKKDp85xpOWQ",
    authDomain: "quiz-signon.firebaseapp.com",
    projectId: "quiz-signon",
    storageBucket: "quiz-signon.firebasestorage.app",
    messagingSenderId: "863414222321",
    appId: "1:863414222321:web:819f5564825308bcd9d850",
    measurementId: "G-4EFDM0CRYY" //
};

// Initialize Firebase App
// This relies on the Firebase SDKs being loaded via CDN in the HTML file.
const app = firebase.initializeApp(firebaseConfig);

// Initialize Firebase Services globally
// These are available to all other modules through the global 'window' object.
window.auth = app.auth();
window.db = firebase.firestore();
// window.analytics will be available if the CDN for it is loaded.

// --- 2. SUPABASE CONFIGURATION ---
// IMPORTANT: You must replace these placeholders with your actual Supabase details.
// You will need to get these from your Supabase Project Settings -> API.
const supabaseUrl = 'https://gkyvojcmqsgdynmitcuf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdreXZvamNtcXNnZHlubWl0Y3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDQ0OTcsImV4cCI6MjA3NjMyMDQ5N30.5dn5HbXxQ5sYNECS9o3VxVeyL6I6Z2Yf-nmPwztx1hE';

// Initialize Supabase Client globally
// This relies on the Supabase CDN being loaded in the HTML file.
window.supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

console.log("[CONFIG] Firebase and Supabase clients initialized globally.");
