/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const schema = require('./schema');

// Create MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root1',
    database: process.env.DB_NAME || 'esports_tournament',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Create Drizzle instance
const db = drizzle(pool, { schema, mode: 'default' });

module.exports = {
    db,
    pool
};
