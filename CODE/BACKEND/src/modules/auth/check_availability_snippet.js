// Check IGN availability
exports.checkAvailability = async (req, res) => {
    try {
        const { username, ign } = req.body;

        // Check username if provided
        if (username) {
            const existingUsername = await db.select()
                .from(users)
                .where(eq(users.username, username))
                .limit(1);

            if (existingUsername.length > 0) {
                return res.json({ available: false, field: 'username' });
            }
        }

        // Check IGN if provided (case-insensitive)
        if (ign) {
            const normalizedIgn = ign.trim().toLowerCase();
            const existingIgn = await db.select()
                .from(playerProfiles)
                .where(sql`LOWER(${playerProfiles.ign}) = ${normalizedIgn}`)
                .limit(1);

            if (existingIgn.length > 0) {
                return res.json({ available: false, field: 'ign' });
            }
        }

        res.json({ available: true });
    } catch (error) {
        console.error('Check availability error:', error);
        res.status(500).json({ available: null });
    }
};
