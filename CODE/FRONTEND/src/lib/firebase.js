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

const isFirebaseConfigured = [
    firebaseConfig.apiKey,
    firebaseConfig.projectId,
    firebaseConfig.messagingSenderId,
    firebaseConfig.appId,
].every(Boolean);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;

if (auth) {
    auth.useDeviceLanguage(); // Set to browser language for OTP SMS
} else {
    console.warn('Firebase is not configured. Set VITE_FIREBASE_* env vars to enable auth.');
}

export { auth, isFirebaseConfigured };

export default app;
