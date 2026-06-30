require('dotenv').config();
const { pool } = require('../src/db');

async function main() {
  try {
    const res = await pool.query(`
      UPDATE users 
      SET mfa_enabled = false, mfa_secret = NULL
    `);
    console.log(`MFA successfully reset for all users. Rows updated: ${res.rowCount}`);
  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    await pool.end();
  }
}

main();

