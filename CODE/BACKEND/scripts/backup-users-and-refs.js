#!/usr/bin/env node
/**
 * Backup users and all rows referencing users into a JSON file.
 * Usage: node scripts/backup-users-and-refs.js
 */
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const quoteIdent = (v) => `"${String(v).replace(/"/g, '""')}"`;
  try {
    const out = {};

    // Fetch all users
    const usersRes = await client.query('SELECT * FROM users');
    out.users = usersRes.rows;
    const userIds = usersRes.rows.map(r => String(r.id));

    // Find FK tables that reference users.id
    const fkRes = await client.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND ccu.table_name = 'users'
        AND ccu.column_name = 'id'
      ORDER BY tc.table_name
    `);

    for (const fk of fkRes.rows) {
      const table = fk.table_name;
      const col = fk.column_name;
      if (table === 'users') continue;
      const q = `SELECT * FROM ${quoteIdent(table)} WHERE ${quoteIdent(col)}::text = ANY($1::text[])`;
      const r = await client.query(q, [userIds]);
      out[table] = r.rows;
    }

    const outPath = path.resolve(__dirname, '..', '..', 'backups', `users_backup_${Date.now()}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log('Backup written to', outPath);
  } catch (err) {
    console.error('Backup failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
