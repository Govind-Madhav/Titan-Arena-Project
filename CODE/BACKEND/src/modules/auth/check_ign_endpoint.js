// Check IGN availability (dedicated endpoint)
exports.checkIgn = async (req, res) => {
    try {
        const { ign } = req.body;

        if (!ign || ign.length < 3) {
            return res.json({ available: null });
        }

        // Check IGN (case-insensitive)
        const normalizedIgn = ign.trim().toLowerCase();
        const existingIgn = await db.select()
            .from(playerProfiles)
            .where(sql`LOWER(${playerProfiles.ign}) = ${normalizedIgn}`)
            .limit(1);

        res.json({ available: existingIgn.length === 0 });
    } catch (error) {
        console.error('Check IGN error:', error);
        res.status(500).json({ available: null });
    }
};
