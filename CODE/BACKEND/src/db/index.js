/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const schema = require('./schema');

// Create PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    ssl: false, // Disable SSL for local development
});

// Create Drizzle instance
const db = drizzle(pool, {
    schema,
    logger: true,  // Enable for debugging, disable in production if noisy
});

module.exports = {
    db,
    pool
};
