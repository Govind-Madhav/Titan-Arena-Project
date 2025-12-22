/**
 * Firebase Realtime Database Configuration
 * Used for real-time features: live match updates, notifications, lobby state
 * MySQL remains the source of truth for persistent data
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseApp = null;
let database = null;

/**
 * Load service account from environment or file
 * Priority: ENV_VAR > File path from ENV > Default file location
 */
const getServiceAccount = () => {
    try {
        // 🔐 PRIORITY 1: Service account as JSON string in env var (MOST SECURE)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        }

        // 🔐 PRIORITY 2: Service account file path from env var
        if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
            const filePath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
            if (fs.existsSync(filePath)) {
                return require(filePath);
            }
            throw new Error(`Service account file not found: ${filePath}`);
        }

        // 🔐 PRIORITY 3: Default location (local dev only)
        const defaultPath = path.join(__dirname, '../../Firebase/e-sports-tournament-ba4c6-firebase-adminsdk-fbsvc-dc828d7473.json');
        if (fs.existsSync(defaultPath)) {
            console.warn('⚠️  Using default service account path. Set FIREBASE_SERVICE_ACCOUNT_JSON for production.');
            return require(defaultPath);
        }

        throw new Error('No Firebase service account found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH');
    } catch (error) {
        console.error('❌ Failed to load Firebase service account:', error.message);
        throw error;
    }
};

/**
 * Initialize Firebase Admin SDK
 */
const initializeFirebase = () => {
    try {
        // ✅ FIX: Check if app already exists to prevent crashes
        if (admin.apps.length > 0) {
            firebaseApp = admin.app();
            database = firebaseApp.database();
            if (process.env.NODE_ENV !== 'production') {
                console.log('✅ Firebase already initialized (reusing existing app)');
            }
            return Object.freeze({ app: firebaseApp, db: database });
        }

        // Load service account
        const serviceAccount = getServiceAccount();

        // Initialize Firebase Admin
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://e-sports-tournament-ba4c6-default-rtdb.asia-southeast1.firebasedatabase.app'
        });

        // Get database reference
        database = firebaseApp.database();

        // ✅ FIX: Only log in development, hide in production
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔥 Firebase initialized successfully');
        }

        return Object.freeze({ app: firebaseApp, db: database });
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error.message);
        throw error;
    }
};

/**
 * Get Firebase database reference
 */
const getDatabase = () => {
    if (!database) {
        const { db } = initializeFirebase();
        return db;
    }
    return database;
};

/**
 * Get Firebase app instance
 */
const getApp = () => {
    if (!firebaseApp) {
        const { app } = initializeFirebase();
        return app;
    }
    return firebaseApp;
};

/**
 * Health check for Firebase connection
 * ✅ FIX: Test actual write capability, not just connection flag
 */
const checkFirebaseHealth = async () => {
    try {
        const db = getDatabase();

        // Kubernetes-style readiness probe: test actual write capability
        const healthCheckRef = db.ref('_healthcheck');
        const timestamp = Date.now();

        await healthCheckRef.set({
            timestamp,
            service: 'backend'
        });

        // Verify write succeeded by reading back
        const snapshot = await healthCheckRef.once('value');
        const data = snapshot.val();

        if (data && data.timestamp === timestamp) {
            return {
                status: 'connected',
                message: 'Firebase is healthy (write verified)',
                timestamp: new Date().toISOString()
            };
        }

        return {
            status: 'degraded',
            message: 'Firebase write verification failed',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * Graceful shutdown
 */
const closeFirebase = async () => {
    try {
        if (firebaseApp) {
            await firebaseApp.delete();
            firebaseApp = null;
            database = null;

            if (process.env.NODE_ENV !== 'production') {
                console.log('🔥 Firebase connection closed');
            }
        }
    } catch (error) {
        console.error('❌ Error closing Firebase:', error.message);
    }
};

module.exports = {
    initializeFirebase,
    getDatabase,
    getApp,
    checkFirebaseHealth,
    closeFirebase
};
