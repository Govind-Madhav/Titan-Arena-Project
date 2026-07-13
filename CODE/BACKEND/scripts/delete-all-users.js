#!/usr/bin/env node
/**
 * Dangerous: deletes ALL users and rows referencing them.
 * Default mode: dry-run (shows counts). To execute, pass --yes
 * Usage (dry-run): node scripts/delete-all-users.js
 * Usage (execute): node scripts/delete-all-users.js --yes
 */
require('dotenv').config();
const { Client } = require('pg');

const args = process.argv.slice(2);
const doExecute = args.includes('--yes');

const quoteIdent = (v) => `"${String(v).replace(/"/g, '""')}"`;

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const usersRes = await client.query('SELECT id FROM users');
    const userIds = usersRes.rows.map(r => String(r.id));
    console.log(`Users found: ${userIds.length}`);
    if (userIds.length === 0) {
      await client.end();
      return;
    }

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

    if (!doExecute) {
      console.log('\nDRY RUN: counts of rows that would be deleted:');
      for (const fk of fkRes.rows) {
        if (fk.table_name === 'users') continue;
        const countQ = `SELECT COUNT(*)::int AS cnt FROM ${quoteIdent(fk.table_name)} WHERE ${quoteIdent(fk.column_name)}::text = ANY($1::text[])`;
        const c = await client.query(countQ, [userIds]);
        console.log(`${fk.table_name}.${fk.column_name}: ${c.rows[0].cnt}`);
      }
      console.log(`\nTo actually delete these rows and all users, re-run with --yes`);
      await client.end();
      return;
    }

    console.log('\nExecuting deletion (this is irreversible)');
    await client.query('BEGIN');

    for (const fk of fkRes.rows) {
      if (fk.table_name === 'users') continue;
      const delSql = `DELETE FROM ${quoteIdent(fk.table_name)} WHERE ${quoteIdent(fk.column_name)}::text = ANY($1::text[])`;
      const res = await client.query(delSql, [userIds]);
      console.log(`Deleted ${res.rowCount} rows from ${fk.table_name}`);
    }

    const delUsers = await client.query('DELETE FROM users WHERE id::text = ANY($1::text[])', [userIds]);
    console.log(`Deleted ${delUsers.rowCount} users`);

    await client.query('COMMIT');
    console.log('Deletion completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error during deletion:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
