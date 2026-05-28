import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  enableMultiTabIndexedDbPersistence,
  getDoc as originalGetDoc,
  getDocs as originalGetDocs
} from "firebase/firestore";
import { logApiCall } from "./apiLogger";

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

/**
 * Wrapper for Firestore getDoc that logs the API call for debugging and profiling.
 *
 * @param {import("firebase/firestore").DocumentReference} docRef - The Firestore document reference to fetch.
 * @returns {Promise<import("firebase/firestore").DocumentSnapshot>} A promise that resolves with the document snapshot.
 * @throws {Error} If the getDoc call fails, it logs the error and rethrows.
 */
export const getDoc = async (docRef) => {
  const startTime = Date.now();
  const path = docRef?.path || "unknown";
  try {
    const result = await originalGetDoc(docRef);
    const duration = Date.now() - startTime;
    logApiCall("Firebase", `getDoc: ${path}`, "SUCCESS", duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logApiCall("Firebase", `getDoc: ${path}`, "ERROR", duration, error.message);
    throw error;
  }
};

/**
 * Wrapper for Firestore getDocs that logs the API call for debugging and profiling.
 *
 * @param {import("firebase/firestore").Query} queryRef - The Firestore query to execute.
 * @returns {Promise<import("firebase/firestore").QuerySnapshot>} A promise that resolves with the query snapshot.
 * @throws {Error} If the getDocs call fails, it logs the error and rethrows.
 */
export const getDocs = async (queryRef) => {
  const startTime = Date.now();
  let path = "unknown";
  if (queryRef) {
    if (typeof queryRef.path === "string") {
      path = queryRef.path;
    } else if (queryRef._query && queryRef._query.path && typeof queryRef._query.path.toString === "function") {
      path = queryRef._query.path.toString();
    } else {
      path = "stock_history";
    }
  }
  try {
    const result = await originalGetDocs(queryRef);
    const duration = Date.now() - startTime;
    logApiCall("Firebase", `getDocs: ${path} (returned ${result?.size || 0} docs)`, "SUCCESS", duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logApiCall("Firebase", `getDocs: ${path}`, "ERROR", duration, error.message);
    throw error;
  }
};