
const { db } = require('../src/db');
const { users, playerProfiles } = require('../src/db/schema');
const { eq, isNull } = require('drizzle-orm');

async function migrateProfiles() {
    console.log('📦 Starting profile migration...');
    try {
        const allUsers = await db.select().from(users);
        console.log(`Found ${allUsers.length} users.`);

        let createdCount = 0;
        for (const user of allUsers) {
            // Check if profile exists
            const existingProfile = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, user.id));

            if (existingProfile.length === 0) {
                // Create empty profile
                await db.insert(playerProfiles).values({
                    userId: user.id,
                    ign: user.username, // Default IGN to username
                    realName: user.legalName, // Default to legal name
                    bio: user.bio,
                    avatarUrl: user.avatarUrl,
                    country: user.countryCode, // Map legacy fields
                    state: user.state,
                    city: user.city,
                    completionPercentage: 20 // Base completion
                });
                createdCount++;
            }
        }

        console.log(`✅ Migration complete. Created ${createdCount} new profiles.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

migrateProfiles();
