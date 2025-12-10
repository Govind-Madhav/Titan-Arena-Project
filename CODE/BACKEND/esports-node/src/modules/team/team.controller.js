const prisma = require('../../config/prisma');
const { z } = require('zod');

// Create team
exports.createTeam = async (req, res) => {
    try {
        const schema = z.object({
            name: z.string().min(2).max(50),
            maxMembers: z.number().int().min(2).max(10).optional().default(5)
        });

        const { name, maxMembers } = schema.parse(req.body);

        const team = await prisma.$transaction(async (tx) => {
            const newTeam = await tx.team.create({
                data: {
                    name,
                    captainId: req.user.id,
                    maxMembers
                }
            });

            // Add captain as member
            await tx.teamMember.create({
                data: {
                    userId: req.user.id,
                    teamId: newTeam.id,
                    role: 'CAPTAIN'
                }
            });

            return newTeam;
        });

        res.status(201).json({
            success: true,
            message: 'Team created successfully',
            data: team
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors
            });
        }
        console.error('Create team error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create team'
        });
    }
};

// Get my teams
exports.getMyTeams = async (req, res) => {
    try {
        const teams = await prisma.team.findMany({
            where: {
                OR: [
                    { captainId: req.user.id },
                    { members: { some: { userId: req.user.id } } }
                ]
            },
            include: {
                captain: {
                    select: { id: true, username: true }
                },
                members: {
                    include: {
                        user: {
                            select: { id: true, username: true }
                        }
                    }
                },
                _count: { select: { members: true } }
            }
        });

        res.json({
            success: true,
            data: teams
        });
    } catch (error) {
        console.error('Get my teams error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch teams'
        });
    }
};

// Get team by ID
exports.getTeam = async (req, res) => {
    try {
        const team = await prisma.team.findUnique({
            where: { id: req.params.id },
            include: {
                captain: {
                    select: { id: true, username: true }
                },
                members: {
                    include: {
                        user: {
                            select: { id: true, username: true, isBanned: true }
                        }
                    }
                }
            }
        });

        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        res.json({
            success: true,
            data: team
        });
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch team'
        });
    }
};

// Update team (captain only)
exports.updateTeam = async (req, res) => {
    try {
        const team = await prisma.team.findUnique({
            where: { id: req.params.id }
        });

        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        if (team.captainId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Only captain can update team'
            });
        }

        const schema = z.object({
            name: z.string().min(2).max(50).optional()
        });

        const data = schema.parse(req.body);

        const updated = await prisma.team.update({
            where: { id: req.params.id },
            data
        });

        res.json({
            success: true,
            message: 'Team updated',
            data: updated
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors
            });
        }
        console.error('Update team error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update team'
        });
    }
};

// Delete team (captain only)
exports.deleteTeam = async (req, res) => {
    try {
        const team = await prisma.team.findUnique({
            where: { id: req.params.id }
        });

        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        if (team.captainId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Only captain can delete team'
            });
        }

        await prisma.team.delete({
            where: { id: req.params.id }
        });

        res.json({
            success: true,
            message: 'Team deleted'
        });
    } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete team'
        });
    }
};

// Add member (captain only)
exports.addMember = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID required'
            });
        }

        const team = await prisma.team.findUnique({
            where: { id: req.params.id },
            include: { members: true }
        });

        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        if (team.captainId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Only captain can add members'
            });
        }

        if (team.members.length >= team.maxMembers) {
            return res.status(400).json({
                success: false,
                message: `Team is full (max ${team.maxMembers} members)`
            });
        }

        // Check user exists and not banned
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isBanned) {
            return res.status(400).json({
                success: false,
                message: 'Cannot add banned user to team'
            });
        }

        // Check not already member
        const existing = team.members.find(m => m.userId === userId);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'User is already a member'
            });
        }

        const member = await prisma.teamMember.create({
            data: {
                userId,
                teamId: team.id,
                role: 'MEMBER'
            },
            include: {
                user: {
                    select: { id: true, username: true }
                }
            }
        });

        res.status(201).json({
            success: true,
            message: 'Member added',
            data: member
        });
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add member'
        });
    }
};

// Remove member (captain or self)
exports.removeMember = async (req, res) => {
    try {
        const { userId } = req.params;

        const team = await prisma.team.findUnique({
            where: { id: req.params.id }
        });

        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        // Can remove if captain OR removing self
        const isCaptain = team.captainId === req.user.id;
        const isSelf = userId === req.user.id;

        if (!isCaptain && !isSelf) {
            return res.status(403).json({
                success: false,
                message: 'Only captain can remove other members'
            });
        }

        // Captain cannot remove themselves
        if (userId === team.captainId) {
            return res.status(400).json({
                success: false,
                message: 'Captain cannot leave. Transfer captaincy or delete team.'
            });
        }

        await prisma.teamMember.deleteMany({
            where: {
                teamId: team.id,
                userId
            }
        });

        res.json({
            success: true,
            message: 'Member removed'
        });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove member'
        });
    }
};
