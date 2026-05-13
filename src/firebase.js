import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB63-pK0kObmbvZ05EhoccGZYXlfZPCJpc",
  authDomain: "tornagator.firebaseapp.com",
  projectId: "tornagator",
  storageBucket: "tornagator.firebasestorage.app",
  messagingSenderId: "841894955524",
  appId: "1:841894955524:web:3a8180b19ac31dd98d8351"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);