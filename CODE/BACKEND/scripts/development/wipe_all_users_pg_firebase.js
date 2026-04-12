/**
 * Wipes all users from PostgreSQL and Firebase Authentication.
 * Usage: node scripts/development/wipe_all_users_pg_firebase.js
 */

require('dotenv').config();
const { sql } = require('drizzle-orm');
const { db, pool } = require('../../src/db');
const { admin, initializeFirebase, closeFirebase } = require('../../src/config/firebase.config');

async function countPgUsers() {
  const result = await db.execute(sql`SELECT COUNT(*)::int AS total FROM users`);
  return Number(result.rows?.[0]?.total || 0);
}

async function listAllFirebaseUids() {
  const uids = [];
  let pageToken;

  do {
    const page = await admin.auth().listUsers(1000, pageToken);
    for (const userRecord of page.users) {
      uids.push(userRecord.uid);
    }
    pageToken = page.pageToken;
  } while (pageToken);

  return uids;
}

async function deleteFirebaseUsers(uids) {
  if (uids.length === 0) {
    return { deleted: 0, failed: 0 };
  }

  let deleted = 0;
  let failed = 0;

  for (let i = 0; i < uids.length; i += 1000) {
    const batch = uids.slice(i, i + 1000);
    const result = await admin.auth().deleteUsers(batch);
    deleted += result.successCount;
    failed += result.failureCount;
  }

  return { deleted, failed };
}

async function main() {
  console.log('\n=== USER WIPE STARTED ===');

  try {
    initializeFirebase();

    const pgBefore = await countPgUsers();
    console.log(`PostgreSQL users before wipe: ${pgBefore}`);

    const firebaseUids = await listAllFirebaseUids();
    console.log(`Firebase Auth users before wipe: ${firebaseUids.length}`);

    // Clear user-related tables explicitly to avoid stale profile rows in legacy schemas.
    await db.execute(sql.raw(
      'TRUNCATE TABLE playergameprofile, playerprofile, host_profiles, host_applications, refreshtoken, wallet, transaction, notification, kycrequest, users RESTART IDENTITY CASCADE'
    ));

    const firebaseResult = await deleteFirebaseUsers(firebaseUids);

    const pgAfter = await countPgUsers();
    const firebaseAfter = (await listAllFirebaseUids()).length;

    console.log('\n=== USER WIPE COMPLETE ===');
    console.log(`PostgreSQL users after wipe: ${pgAfter}`);
    console.log(`Firebase Auth users after wipe: ${firebaseAfter}`);
    console.log(`Firebase deleted: ${firebaseResult.deleted}, failed: ${firebaseResult.failed}`);
  } catch (error) {
    console.error('\nUser wipe failed:', error.message);
    process.exitCode = 1;
  } finally {
    await closeFirebase();
    await pool.end();
  }
}

main();
