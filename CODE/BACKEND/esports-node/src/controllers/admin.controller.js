const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const { role, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (role) where.role = role;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    mobile: true,
                    role: true,
                    verified: true,
                    imageUrl: true,
                    createdAt: true,
                    _count: {
                        select: {
                            hostedTournaments: true,
                            participations: true,
                            payments: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.user.count({ where })
        ]);

        res.json({
            success: true,
            data: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
};

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                fullName: true,
                email: true,
                mobile: true,
                role: true,
                verified: true,
                imageUrl: true,
                createdAt: true,
                updatedAt: true,
                hostedTournaments: {
                    select: { id: true, name: true, isActive: true }
                },
                participations: {
                    include: {
                        tournament: {
                            select: { id: true, name: true }
                        }
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user'
        });
    }
};

// Update user
exports.updateUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { fullName, mobile, verified, imageUrl } = req.body;

        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (mobile !== undefined) updateData.mobile = mobile;
        if (verified !== undefined) updateData.verified = verified;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                fullName: true,
                email: true,
                mobile: true,
                role: true,
                verified: true,
                imageUrl: true
            }
        });

        res.json({
            success: true,
            message: 'User updated successfully',
            data: user
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Prevent deleting self
        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        await prisma.user.delete({
            where: { id: userId }
        });

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
};

// Update user role
exports.updateUserRole = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { role } = req.body;

        const validRoles = ['ADMIN', 'HOST', 'PLAYER'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role'
            });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { role },
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true
            }
        });

        res.json({
            success: true,
            message: `User role updated to ${role}`,
            data: user
        });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user role'
        });
    }
};

// Get all tournaments (admin view)
exports.getAllTournaments = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [tournaments, total] = await Promise.all([
            prisma.tournament.findMany({
                include: {
                    host: {
                        select: { id: true, fullName: true, email: true }
                    },
                    _count: {
                        select: { participants: true, payments: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.tournament.count()
        ]);

        res.json({
            success: true,
            data: tournaments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get all tournaments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tournaments'
        });
    }
};

// Delete tournament (admin)
exports.deleteTournament = async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.id);

        await prisma.tournament.delete({
            where: { id: tournamentId }
        });

        res.json({
            success: true,
            message: 'Tournament deleted successfully'
        });
    } catch (error) {
        console.error('Delete tournament error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete tournament'
        });
    }
};

// Get dashboard stats
exports.getStats = async (req, res) => {
    try {
        const [
            totalUsers,
            totalHosts,
            totalPlayers,
            totalTournaments,
            activeTournaments,
            totalPayments,
            totalRevenue
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { role: 'HOST' } }),
            prisma.user.count({ where: { role: 'PLAYER' } }),
            prisma.tournament.count(),
            prisma.tournament.count({ where: { isActive: true } }),
            prisma.payment.count({ where: { status: true } }),
            prisma.payment.aggregate({
                where: { status: true },
                _sum: { amount: true }
            })
        ]);

        res.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    hosts: totalHosts,
                    players: totalPlayers
                },
                tournaments: {
                    total: totalTournaments,
                    active: activeTournaments
                },
                payments: {
                    total: totalPayments,
                    revenue: totalRevenue._sum.amount || 0
                }
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch stats'
        });
    }
};
