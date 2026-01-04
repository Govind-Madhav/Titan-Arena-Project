/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const schema = require('./schema');

// Create MySQL connection pool (URI only - production-safe)
const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
});

// Create Drizzle instance (STRICT MySQL MODE - prevents DEFAULT keyword injection)
const db = drizzle(pool, {
    schema,
    mode: 'mysql', // CRITICAL: Prevents Postgres-style DEFAULT injection
    logger: true,  // Enable for debugging, disable in production if noisy
});

module.exports = {
    db,
    pool
};
