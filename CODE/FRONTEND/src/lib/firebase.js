/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * Firebase Client SDK Configuration
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// These values should be provided via environment variables in production
// For now, using the ones corresponding to the project id mentioned in plan
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
auth.useDeviceLanguage(); // Set to browser language for OTP SMS

export default app;
