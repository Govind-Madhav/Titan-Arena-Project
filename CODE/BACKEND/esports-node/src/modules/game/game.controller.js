const prisma = require('../../config/prisma');

// Get all active games
exports.getAllGames = async (req, res) => {
    try {
        const games = await prisma.game.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        });

        res.json({
            success: true,
            data: games
        });
    } catch (error) {
        console.error('Get all games error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch games'
        });
    }
};

// Get single game by slug
exports.getGameBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const game = await prisma.game.findUnique({
            where: { slug }
        });

        if (!game) {
            return res.status(404).json({
                success: false,
                message: 'Game not found'
            });
        }

        res.json({
            success: true,
            data: game
        });
    } catch (error) {
        console.error('Get game by slug error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch game'
        });
    }
};
