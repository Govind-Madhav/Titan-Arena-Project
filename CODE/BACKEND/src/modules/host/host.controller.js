/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { hostApplications, hostProfiles, users } = require('../../db/schema');
const { eq, and } = require('drizzle-orm');

// Apply for Host Status
const applyForHost = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notes, documentsUrl } = req.body;

        // 1. Eligibility Check
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        if (!user[0]) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user[0].isBanned) {
            return res.status(403).json({ success: false, message: 'Banned users cannot apply for Host status.' });
        }

        if (!user[0].emailVerified) {
            return res.status(400).json({ success: false, message: 'Please verify your email before applying.' });
        }

        // 2. Eligibility: Check if already a Host
        const existingProfile = await db.select()
            .from(hostProfiles)
            .where(eq(hostProfiles.userId, userId))
            .limit(1);

        if (existingProfile.length > 0) {
            return res.status(409).json({ success: false, message: 'You are already a registered Host.' });
        }

        // 3. Check for existing pending application
        const existingApp = await db.select()
            .from(hostApplications)
            .where(and(
                eq(hostApplications.userId, userId),
                eq(hostApplications.status, 'PENDING')
            ))
            .limit(1);

        if (existingApp.length > 0) {
            return res.status(409).json({ success: false, message: 'You already have a pending application.' });
        }

        // 4. Create Application
        await db.insert(hostApplications).values({
            userId,
            status: 'PENDING',
            notes,
            documentsUrl
        });

        res.status(201).json({
            success: true,
            message: 'Host application submitted successfully. An admin will review it shortly.'
        });

    } catch (error) {
        console.error('Host application error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit application' });
    }
};


module.exports = {
    applyForHost
};
