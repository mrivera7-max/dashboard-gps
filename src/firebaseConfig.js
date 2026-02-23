import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Config REAL (solo una vez)
const firebaseConfig = {
  apiKey: "AIzaSyDV7Satq_3EJGorG9_2hngpU6o5-JftxAc",
  authDomain: "dashboard-gps-udi.firebaseapp.com",
  projectId: "dashboard-gps-udi",
  storageBucket: "dashboard-gps-udi.firebasestorage.app",
  messagingSenderId: "610504501396",
  appId: "1:610504501396:web:2e13eb98c21af119f3ec81",
  measurementId: "G-THW6WQPB1C",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");