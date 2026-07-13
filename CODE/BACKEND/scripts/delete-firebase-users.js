#!/usr/bin/env node
/**
 * Backup all Firebase Auth users to JSON and delete them.
 * Usage: node scripts/delete-firebase-users.js
 * This will create backups/firebase_users_backup_<ts>.json
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initializeFirebase, admin, closeFirebase } = require('../src/config/firebase.config');

async function listAllUsers() {
  const users = [];
  let pageToken = undefined;
  do {
    const res = await admin.auth().listUsers(1000, pageToken);
    users.push(...res.users.map(u => ({ uid: u.uid, email: u.email, displayName: u.displayName, providerData: u.providerData })));
    pageToken = res.pageToken;
  } while (pageToken);
  return users;
}

async function main() {
  try {
    initializeFirebase();
    console.log('Listing Firebase users...');
    const users = await listAllUsers();
    console.log(`Found ${users.length} Firebase users`);

    const outDir = path.resolve(__dirname, '..', '..', 'backups');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `firebase_users_backup_${Date.now()}.json`);
    fs.writeFileSync(outPath, JSON.stringify(users, null, 2));
    console.log('Backup written to', outPath);

    if (users.length === 0) {
      console.log('No users to delete. Exiting.');
      await closeFirebase();
      return;
    }

    console.log('Deleting Firebase users...');
    for (const u of users) {
      try {
        await admin.auth().deleteUser(u.uid);
        console.log('Deleted', u.uid);
      } catch (err) {
        console.warn('Failed to delete', u.uid, err.message || err.code || err);
      }
    }

    console.log('Firebase deletion complete.');
    await closeFirebase();
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exitCode = 1;
  }
}

main();
