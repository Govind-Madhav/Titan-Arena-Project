/**
 * Firebase Realtime Database Helper Utilities
 * Simplified CRUD operations for Firebase
 * 
 * ⚠️ ARCHITECTURE RULES:
 * ✅ DO USE for: Live match scores, tournament UI updates, lobby state, spectator counters
 * ❌ DO NOT USE for: Wallets, money, auth, permissions, admin state (use MySQL)
 * 
 * Backend should PUBLISH events, not SUBSCRIBE to Firebase state.
 */

const { getDatabase } = require('../config/firebase.config');

// ✅ FIX: Base namespace to prevent catastrophic mistakes
const BASE_PATH = 'realtime';

/**
 * Normalize path to ensure it's under BASE_PATH namespace
 * Prevents accidentally writing to root and wiping entire DB
 */
const normalizePath = (path) => {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    // Prevent empty or root paths
    if (!cleanPath || cleanPath === '/') {
        throw new Error('Invalid Firebase path: cannot be empty or root');
    }

    // Ensure path is under BASE_PATH
    return `${BASE_PATH}/${cleanPath}`;
};

/**
 * Write data to Firebase path (overwrites existing data)
 * @param {string} path - Path relative to BASE_PATH (e.g., 'matches/123/score')
 * @param {any} data - Data to write
 */
const writeData = async (path, data) => {
    try {
        const db = getDatabase();
        const safePath = normalizePath(path);
        await db.ref(safePath).set(data);
        return { success: true, path: safePath };
    } catch (error) {
        console.error(`Firebase write error at ${path}:`, error.message);
        throw error;
    }
};

/**
 * Update data at Firebase path (merges with existing data)
 * @param {string} path - Path relative to BASE_PATH
 * @param {object} data - Data to merge
 */
const updateData = async (path, data) => {
    try {
        const db = getDatabase();
        const safePath = normalizePath(path);
        await db.ref(safePath).update(data);
        return { success: true, path: safePath };
    } catch (error) {
        console.error(`Firebase update error at ${path}:`, error.message);
        throw error;
    }
};

/**
 * Read data from Firebase path
 * @param {string} path - Path relative to BASE_PATH
 * @returns {any} Data at path, or undefined if path doesn't exist
 */
const readData = async (path) => {
    try {
        const db = getDatabase();
        const safePath = normalizePath(path);
        const snapshot = await db.ref(safePath).once('value');

        // ✅ FIX: Explicit undefined for non-existent paths
        const value = snapshot.val();
        return value === null ? undefined : value;
    } catch (error) {
        console.error(`Firebase read error at ${path}:`, error.message);
        throw error;
    }
};

/**
 * Delete data at Firebase path
 * @param {string} path - Path relative to BASE_PATH
 */
const deleteData = async (path) => {
    try {
        const db = getDatabase();
        const safePath = normalizePath(path);
        await db.ref(safePath).remove();
        return { success: true, path: safePath };
    } catch (error) {
        console.error(`Firebase delete error at ${path}:`, error.message);
        throw error;
    }
};

/**
 * Push new data to Firebase list (generates unique key)
 * @param {string} path - Path to list, relative to BASE_PATH
 * @param {any} data - Data to push
 * @returns {object} { success, key, path }
 */
const pushData = async (path, data) => {
    try {
        const db = getDatabase();
        const safePath = normalizePath(path);
        const newRef = await db.ref(safePath).push(data);
        return { success: true, key: newRef.key, path: safePath };
    } catch (error) {
        console.error(`Firebase push error at ${path}:`, error.message);
        throw error;
    }
};

/**
 * Query data with filters
 * 
 * ⚠️ IMPORTANT: Ensure Firebase indexes exist for orderByChild fields
 * See: Firebase Console → Realtime Database → Rules → Indexes
 * 
 * @param {string} path - Path relative to BASE_PATH
 * @param {object} options - Query options
 * @param {string} options.orderBy - Child key to order by
 * @param {number} options.limitToFirst - Limit to first N results
 * @param {number} options.limitToLast - Limit to last N results
 * @param {any} options.startAt - Start at value
 * @param {any} options.endAt - End at value
 * @param {any} options.equalTo - Equal to value
 * @returns {any} Query results
 */
const queryData = async (path, options = {}) => {
    try {
        const db = getDatabase();
        const safePath = normalizePath(path);
        let ref = db.ref(safePath);

        // Apply filters
        if (options.orderBy) {
            ref = ref.orderByChild(options.orderBy);
        }
        if (options.limitToFirst) {
            ref = ref.limitToFirst(options.limitToFirst);
        }
        if (options.limitToLast) {
            ref = ref.limitToLast(options.limitToLast);
        }
        if (options.startAt !== undefined) {
            ref = ref.startAt(options.startAt);
        }
        if (options.endAt !== undefined) {
            ref = ref.endAt(options.endAt);
        }
        if (options.equalTo !== undefined) {
            ref = ref.equalTo(options.equalTo);
        }

        const snapshot = await ref.once('value');
        const value = snapshot.val();
        return value === null ? undefined : value;
    } catch (error) {
        console.error(`Firebase query error at ${path}:`, error.message);
        throw error;
    }
};

/**
 * Transaction - atomic update
 * Useful for: counters, concurrent updates, race condition prevention
 * 
 * @param {string} path - Path relative to BASE_PATH
 * @param {function} updateFunction - Function that receives current value and returns new value
 * @returns {object} { success, snapshot }
 */
const transaction = async (path, updateFunction) => {
    try {
        const db = getDatabase();
        const safePath = normalizePath(path);
        const result = await db.ref(safePath).transaction(updateFunction);

        const value = result.snapshot.val();
        return {
            success: result.committed,
            data: value === null ? undefined : value
        };
    } catch (error) {
        console.error(`Firebase transaction error at ${path}:`, error.message);
        throw error;
    }
};

// ==========================================
// FRONTEND / WORKER UTILITIES
// ==========================================

/**
 * ⚠️ WARNING: This function should ONLY be used in:
 * - Frontend applications
 * - Dedicated sync workers
 * - Analytics services
 * 
 * ❌ DO NOT use in API routes or backend request handlers
 * Backend should PUBLISH events, not SUBSCRIBE to Firebase state.
 * 
 * Listen to real-time changes at Firebase path
 * @param {string} path - Path relative to BASE_PATH
 * @param {function} callback - Callback function receiving snapshot value
 * @returns {function} Unsubscribe function to stop listening
 */
const listenToChanges = (path, callback) => {
    console.warn('⚠️  listenToChanges used in backend - ensure this is in a worker/frontend context');

    try {
        const db = getDatabase();
        const safePath = normalizePath(path);
        const ref = db.ref(safePath);

        ref.on('value', (snapshot) => {
            const value = snapshot.val();
            callback(value === null ? undefined : value);
        }, (error) => {
            console.error(`Firebase listener error at ${path}:`, error.message);
        });

        // Return function to stop listening (prevents memory leaks)
        return () => ref.off('value');
    } catch (error) {
        console.error(`Firebase listener setup error at ${path}:`, error.message);
        throw error;
    }
};

module.exports = {
    // Core CRUD operations (safe for backend)
    writeData,
    updateData,
    readData,
    deleteData,
    pushData,
    queryData,
    transaction,

    // Frontend/Worker only (dangerous in backend)
    listenToChanges
};
