import { initializeApp } from "firebase/app";
import { initializeFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";

// Fallback for missing environment variables to prevent // in paths
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "tornagator", // Fallback to 'tornagator' as seen in .env
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || ""
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with long-polling to bypass WebSocket blocks (Cloudflare/Proxies)
// Using a more standard initialization to ensure app options are correctly picked up
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Enable multi-tab offline persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn("Firestore persistence failed: Multiple tabs open.");
    } else if (err.code === 'unimplemented') {
        console.warn("Firestore persistence is not supported in this browser.");
    }
});