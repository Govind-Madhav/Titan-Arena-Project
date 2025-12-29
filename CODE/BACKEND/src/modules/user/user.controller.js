
const { db } = require('../../db');
const { users, playerProfiles, playerGameProfiles } = require('../../db/schema');
const { eq } = require('drizzle-orm');

// Get User Profile (Combined)
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        const profile = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);
        const games = await db.select().from(playerGameProfiles).where(eq(playerGameProfiles.userId, userId));

        if (!user.length) return res.status(404).json({ success: false, message: 'User not found' });

        // Combine data
        const fullProfile = {
            ...user[0],
            passwordHash: undefined, // Security
            profile: profile[0] || {},
            gameProfiles: games
        };

        res.json({ success: true, data: fullProfile });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
};

// Update Player Profile (Identity, Contact, Location)
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = req.body; // ign, bio, preferredServer, discordId, etc.

        // 1. Update Core User (if phone/visibility changed)
        if (data.phoneVisibility) {
            await db.update(users)
                .set({ phoneVisibility: data.phoneVisibility })
                .where(eq(users.id, userId));
        }

        // 2. Update/Upsert Player Profile
        const existing = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);

        const profileData = {
            ign: data.ign,
            realName: data.realName,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
            bio: data.bio,
            avatarUrl: data.avatarUrl,
            country: data.country,
            state: data.state,
            city: data.city,
            preferredServer: data.preferredServer,
            discordId: data.discordId,
            discordVisibility: data.discordVisibility,
            skillLevel: data.skillLevel,
            playStyle: data.playStyle,
            availableDays: data.availableDays,
            availableTime: data.availableTime
            // Recalculate completion % logic here if needed
        };

        // Filter undefined
        Object.keys(profileData).forEach(key => profileData[key] === undefined && delete profileData[key]);

        if (existing.length > 0) {
            await db.update(playerProfiles)
                .set(profileData)
                .where(eq(playerProfiles.id, existing[0].id));
        } else {
            await db.insert(playerProfiles).values({
                userId: userId,
                ...profileData
            });
        }

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
};

// Add Game Profile
exports.addGameProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { game, inGameName, inGameId } = req.body;

        if (!game || !inGameName || !inGameId) {
            return res.status(400).json({ success: false, message: 'Missing fields' });
        }

        await db.insert(playerGameProfiles).values({
            userId,
            game,
            inGameName,
            inGameId,
            verificationStatus: 'PENDING'
        });

        res.json({ success: true, message: 'Game profile added' });
    } catch (error) {
        console.error('Add game error:', error);
        res.status(500).json({ success: false, message: 'Failed to add game profile' });
    }
};

// Remove Game Profile
exports.removeGameProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        await db.delete(playerGameProfiles)
            .where(and(eq(playerGameProfiles.id, id), eq(playerGameProfiles.userId, userId)));

        res.json({ success: true, message: 'Game profile removed' });
    } catch (error) {
        console.error('Remove game error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove game profile' });
    }
};
