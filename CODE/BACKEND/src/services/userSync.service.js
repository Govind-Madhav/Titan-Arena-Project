/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * User Sync Service (Firebase <-> MySQL Bridge)
 */

const { db } = require('../db');
const { users, wallets, playerProfiles } = require('../db/schema');
const { eq, and } = require('drizzle-orm');
const crypto = require('crypto');
const uidService = require('./uid.service');
const { getRegionForCountry, validateSubRegion } = require('../config/regions.config');
const { publishEvent } = require('../config/kafka.config');

const syncUser = async (firebaseUser, metadata = {}) => {
    const { uid, phone_number, email } = firebaseUser;

    try {
        // 1. Primary Lookup: firebase_uid (Identified by Firebase)
        let result = await db.select().from(users).where(eq(users.firebaseUid, uid)).limit(1);
        let user = result[0];

        // 2. Secondary Lookup/Bridge: email (Mapping legacy accounts if they login via Firebase)
        if (!user && email) {
            result = await db.select().from(users).where(eq(users.email, email)).limit(1);
            user = result[0];
            if (user) {
                console.log(`🔗 Bridging legacy user ID ${user.id} to Firebase UID ${uid}`);
                await db.update(users).set({
                    firebaseUid: uid,
                    authProvider: 'FIREBASE',
                    phone: user.phone || phone_number || metadata.phone,
                    phoneVerified: Boolean(phone_number)
                }).where(eq(users.id, user.id));
            }
        }

        // 3. Lazy Creation (Zero-Data-Loss Onboarding)
        if (!user) {
            console.log(`✨ Creating new synchronized user for Firebase UID: ${uid}`);
            await db.transaction(async (tx) => {
                const userId = crypto.randomUUID();

                // CRITICAL: Region is required (no defaults)
                if (!metadata.region) {
                    throw new Error('Region is required to create a user');
                }

                const region = metadata.region;
                const subRegion = metadata.subRegion || null;

                // Validate sub-region belongs to region
                if (subRegion && !validateSubRegion(region, subRegion)) {
                    throw new Error(`Invalid sub-region ${subRegion} for region ${region}`);
                }

                // Normalize IGN (trim, preserve casing for display)
                const finalIgn = metadata.ign ? metadata.ign.trim() : (metadata.username ? metadata.username.trim() : `player_${uid.slice(-6)}`);

                // Check registration completeness
                const isRegistrationComplete = Boolean(
                    metadata.ign &&
                    metadata.username &&
                    metadata.legalName &&
                    (phone_number || metadata.phone)
                );

                // Generate UID with region
                const { uid: platformUid, sequence } = await uidService.generatePlatformUid(region, tx);

                console.log(`✨ Generated UID ${platformUid} for region ${region} (sequence: ${sequence})`);

                // Create User Base
                await tx.insert(users).values({
                    id: userId,
                    firebaseUid: uid,
                    authProvider: 'FIREBASE',
                    email: email || metadata.email || `${uid}@firebase.internal`,
                    username: metadata.username || `player_${uid.slice(-6)}`,
                    legalName: metadata.legalName || 'New Member',
                    dateOfBirth: metadata.dateOfBirth ? new Date(metadata.dateOfBirth) : new Date('2000-01-01'),
                    countryCode: metadata.country || 'IN',
                    state: metadata.state || 'Pending Setup',
                    city: metadata.city || '',
                    regionCode: region,        // 1-6
                    subRegionCode: subRegion,  // AS-SA, etc
                    platformUid,               // e.g., "1000000001"
                    role: 'PLAYER',
                    emailVerified: !!email,
                    phone: phone_number || metadata.phone,
                    phoneVerified: Boolean(phone_number),
                    registrationCompleted: isRegistrationComplete,
                    termsAccepted: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                // Initialize Wallet
                await tx.insert(wallets).values({
                    id: crypto.randomUUID(),
                    userId,
                    balance: 0,
                    locked: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                // Initialize Player Profile with IGN
                // DB constraint handles race condition
                try {
                    await tx.insert(playerProfiles).values({
                        userId,
                        ign: finalIgn,
                        realName: metadata.legalName,
                        dateOfBirth: metadata.dateOfBirth ? new Date(metadata.dateOfBirth) : undefined,
                        country: metadata.country || 'IN',
                        state: metadata.state || 'Pending Setup',
                        city: metadata.city || '',
                        completionPercentage: metadata.ign ? 60 : 5
                    });
                } catch (err) {
                    // PostgreSQL unique violation error code
                    if (err.code === '23505') {
                        throw new Error('Gamertag already taken');
                    }
                    throw err;
                }

                const created = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
                user = created[0];
            });

            // 🔔 KAFKA: Publish user.registered event for welcome notifications / analytics
            await publishEvent('user.registered', {
                eventType: 'USER_REGISTERED',
                userId: user.id,
                username: user.username,
                email: user.email,
                region: user.regionCode,
                platformUid: user.platformUid,
                timestamp: new Date().toISOString()
            });
        } else if (metadata.username && !user.registrationCompleted) {
            // 4. Update existing incomplete user with metadata (Catch-up)
            console.log(`📝 Completing profile for existing Firebase user: ${uid}`);

            await db.transaction(async (tx) => {
                const updateData = {
                    updatedAt: new Date(),
                    registrationCompleted: true
                };

                // Build update object dynamically to avoid setting NOT NULL fields to undefined/null
                if (metadata.username) updateData.username = metadata.username;
                if (metadata.legalName) updateData.legalName = metadata.legalName;
                if (metadata.dateOfBirth) updateData.dateOfBirth = new Date(metadata.dateOfBirth);
                if (metadata.state) updateData.state = metadata.state;
                if (metadata.city !== undefined) updateData.city = metadata.city;
                if (metadata.termsAccepted !== undefined) updateData.termsAccepted = metadata.termsAccepted;

                await tx.update(users).set(updateData).where(eq(users.id, user.id));

                // Also update Player Profile
                const profileUpdate = {
                    completionPercentage: 100 // Fully completed now
                };
                // CRITICAL: Only update IGN if explicitly provided (no username fallback)
                if (metadata.ign) profileUpdate.ign = metadata.ign.trim();
                if (metadata.legalName) profileUpdate.realName = metadata.legalName;
                if (metadata.dateOfBirth) profileUpdate.dateOfBirth = new Date(metadata.dateOfBirth);
                if (metadata.country) profileUpdate.country = metadata.country;
                if (metadata.state) profileUpdate.state = metadata.state;
                if (metadata.city !== undefined) profileUpdate.city = metadata.city;

                if (Object.keys(profileUpdate).length > 1) {
                    await tx.update(playerProfiles)
                        .set(profileUpdate)
                        .where(eq(playerProfiles.userId, user.id));
                }
            });

            const updated = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
            user = updated[0];
        }

        return user;
    } catch (error) {
        console.error('❌ User Sync Critical Failure:', error.message);
        throw error;
    }
};

module.exports = { syncUser };
