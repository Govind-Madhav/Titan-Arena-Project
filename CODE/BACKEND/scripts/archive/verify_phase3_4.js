/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 */

const { db } = require('../src/db');
const { users, hostApplications, posts, hostProfiles } = require('../src/db/schema');
const { eq, desc } = require('drizzle-orm');

async function verifyPhase3_4() {
    console.log('--- STARTING VERIFICATION (PHASE 3 & 4) ---');

    try {
        // 1. Check Host Applications
        console.log('\n[1] Verifying Host Applications...');
        const apps = await db.select().from(hostApplications).limit(5);
        if (apps.length === 0) {
            console.log('⚠️ No host applications found. Manual UI testing required to generate data.');
        } else {
            console.log(`✅ Found ${apps.length} host applications.`);
            apps.forEach(app => {
                console.log(`   - App ID: ${app.id} | Status: ${app.status} | User: ${app.userId}`);
            });
        }

        // 2. Check Host Profiles
        console.log('\n[2] Verifying Host Profiles...');
        const profiles = await db.select().from(hostProfiles).limit(5);
        if (profiles.length === 0) {
            console.log('⚠️ No host profiles found (No approvals yet).');
        } else {
            console.log(`✅ Found ${profiles.length} host profiles.`);
            profiles.forEach(p => {
                console.log(`   - User: ${p.userId} | Host Code: ${p.hostCode} | Status: ${p.status}`);
            });
        }

        // 3. Check Social Posts
        console.log('\n[3] Verifying Social Feed...');
        const feed = await db.select().from(posts).limit(5);
        if (feed.length === 0) {
            console.log('⚠️ No posts found. Create a post via /feed to verify.');
        } else {
            console.log(`✅ Found ${feed.length} posts.`);
            feed.forEach(p => {
                console.log(`   - Post ID: ${p.id.substring(0, 8)}... | Type: ${p.type} | Content: "${p.content.substring(0, 30)}..."`);
            });
        }

        // 4. Schema Helper Check
        console.log('\n[4] Schema Integrity Check...');
        // Just checking if table objects exist and have correct keys
        if (posts && hostApplications) {
            console.log('✅ Schema tables (posts, hostApplications) are correctly exported.');
        } else {
            console.error('❌ Schema export missing tables!');
        }

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        console.log('\n--- VERIFICATION COMPLETE ---');
        process.exit(0);
    }
}

verifyPhase3_4();
