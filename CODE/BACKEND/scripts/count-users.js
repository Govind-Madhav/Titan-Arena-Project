#!/usr/bin/env node
require('dotenv').config();
const { pool } = require('../src/db');

async function main() {
  try {
    const res = await pool.query('SELECT COUNT(*)::int AS count FROM users');
    console.log(`User accounts: ${res.rows[0].count}`);
  } catch (err) {
    console.error('Failed to count users:', err.message || err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
