/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { teams, teamMembers, users } = require('../../db/schema');
const { eq, and, count, or } = require('drizzle-orm');
const crypto = require('node:crypto');

const getTeamAccess = async (teamId, userId) => {
    const [team] = await db.select({
        id: teams.id,
        captainId: teams.captainId,
    })
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);

    if (!team) {
        return { team: null, hasAccess: false };
    }

    if (team.captainId === userId) {
        return { team, hasAccess: true };
    }

    const [membership] = await db.select({ id: teamMembers.id })
        .from(teamMembers)
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
        ))
        .limit(1);

    return { team, hasAccess: Boolean(membership) };
};

// Create a new team
exports.createTeam = async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.id; // From auth

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Team name is required'
            });
        }

        // Check if name exists
        const existing = await db.select().from(teams).where(eq(teams.name, name));
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Team name already exists'
            });
        }

        // Transaction: Create Team + Add Creator as Captain
        await db.transaction(async (tx) => {
            const teamId = crypto.randomUUID();

            // 1. Create Team
            await tx.insert(teams).values({
                id: teamId,
                name: name,
                captainId: userId
            });

            // 2. Add Member (Captain)
            await tx.insert(teamMembers).values({
                teamId: teamId,
                userId: userId,
                role: 'CAPTAIN'
            });
        });

        res.status(201).json({
            success: true,
            message: 'Team created successfully'
        });

    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create team'
        });
    }
};

// Get My Teams
exports.getMyTeams = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch teams where user is a member
        // Join teamMembers -> teams -> captain (user)
        const myTeams = await db.select({
            id: teams.id,
            name: teams.name,
            role: teamMembers.role,
            createdAt: teams.createdAt,
            captain: {
                id: users.id,
                username: users.username
            }
        })
            .from(teamMembers)
            .innerJoin(teams, eq(teamMembers.teamId, teams.id))
            .innerJoin(users, eq(teams.captainId, users.id)) // Join captain details
            .where(eq(teamMembers.userId, userId));

        // For each team, get member count and member list (preview)
        // This is N+1 but efficient enough for "My Teams" (usually < 10 teams)
        const enrichedTeams = await Promise.all(myTeams.map(async (team) => {
            const members = await db.select({
                id: teamMembers.id,
                role: teamMembers.role,
                user: {
                    id: users.id,
                    username: users.username
                }
            })
                .from(teamMembers)
                .innerJoin(users, eq(teamMembers.userId, users.id))
                .where(eq(teamMembers.teamId, team.id));

            return {
                ...team,
                members,
                _count: {
                    members: members.length
                }
            };
        }));

        res.json({
            success: true,
            data: enrichedTeams
        });

    } catch (error) {
        console.error('Get my teams error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch teams'
        });
    }
};

// Get Single Team
exports.getTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { team, hasAccess } = await getTeamAccess(id, userId);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Get members
        const members = await db.select({
            id: teamMembers.id,
            role: teamMembers.role,
            user: {
                id: users.id,
                username: users.username,
                avatarUrl: users.avatarUrl
            }
        })
            .from(teamMembers)
            .innerJoin(users, eq(teamMembers.userId, users.id))
            .where(eq(teamMembers.teamId, id));

        res.json({
            success: true,
            data: {
                ...team,
                members,
                _count: { members: members.length }
            }
        });

    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch team' });
    }
};

// Update Team
exports.updateTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const userId = req.user.id;

        // Verify Captaincy
        const team = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
        if (!team.length) return res.status(404).json({ success: false, message: 'Team not found' });

        if (team[0].captainId !== userId) {
            return res.status(403).json({ success: false, message: 'Only captain can update team' });
        }

        await db.update(teams).set({ name }).where(eq(teams.id, id));

        res.json({ success: true, message: 'Team updated successfully' });

    } catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({ success: false, message: 'Update failed' });
    }
};

// Delete Team
exports.deleteTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const team = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
        if (!team.length) return res.status(404).json({ success: false, message: 'Team not found' });

        if (team[0].captainId !== userId) {
            return res.status(403).json({ success: false, message: 'Only captain can delete team' });
        }

        // Transactional delete
        await db.transaction(async (tx) => {
            await tx.delete(teamMembers).where(eq(teamMembers.teamId, id));
            await tx.delete(teams).where(eq(teams.id, id));
        });

        res.json({ success: true, message: 'Team deleted' });

    } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({ success: false, message: 'Delete failed' });
    }
};

// Add Member
exports.addMember = async (req, res) => {
    try {
        const { id: teamId } = req.params;
        const requesterId = req.user.id;
        const { userId, username, email, role = 'MEMBER' } = req.body;

        const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
        if (team.captainId !== requesterId) {
            return res.status(403).json({ success: false, message: 'Only captain can add members' });
        }

        let targetUserId = userId;
        if (!targetUserId && (username || email)) {
            const [user] = await db.select({ id: users.id })
                .from(users)
                .where(or(
                    username ? eq(users.username, username) : eq(users.id, '__none__'),
                    email ? eq(users.email, email) : eq(users.id, '__none__')
                ))
                .limit(1);
            targetUserId = user?.id;
        }

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: 'userId or username/email is required' });
        }

        const [teamSize] = await db.select({ count: count() })
            .from(teamMembers)
            .where(eq(teamMembers.teamId, teamId));

        if (Number(teamSize.count) >= team.maxMembers) {
            return res.status(400).json({ success: false, message: 'Team is full' });
        }

        const [alreadyInTeam] = await db.select({ id: teamMembers.id })
            .from(teamMembers)
            .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)))
            .limit(1);

        if (alreadyInTeam) {
            return res.status(409).json({ success: false, message: 'User is already in this team' });
        }

        await db.insert(teamMembers).values({
            teamId,
            userId: targetUserId,
            role: role === 'CO_CAPTAIN' ? 'CO_CAPTAIN' : 'MEMBER'
        });

        res.status(201).json({ success: true, message: 'Member added successfully' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ success: false, message: 'User is already in this team' });
        }
        console.error('Add member error:', error);
        res.status(500).json({ success: false, message: 'Failed to add member' });
    }
};

// Remove Member
exports.removeMember = async (req, res) => {
    try {
        const { id, userId: targetUserId } = req.params; // Team ID, Target User ID
        const requesterId = req.user.id;

        const team = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
        if (!team.length) return res.status(404).json({ success: false, message: 'Team not found' });

        // Logic: Captain can remove anyone. User can remove themselves (leave).
        if (requesterId !== team[0].captainId && requesterId !== targetUserId) {
            return res.status(403).json({ success: false, message: 'Permission denied' });
        }

        if (targetUserId === team[0].captainId) {
            return res.status(400).json({ success: false, message: 'Captain cannot leave/be removed. Transfer ownership or delete team.' });
        }

        await db.delete(teamMembers)
            .where(and(
                eq(teamMembers.teamId, id),
                eq(teamMembers.userId, targetUserId)
            ));

        res.json({ success: true, message: 'Member removed' });

    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ success: false, message: 'Action failed' });
    }
};

exports.updateMemberRole = async (req, res) => {
    try {
        const { id: teamId, userId: targetUserId } = req.params;
        const requesterId = req.user.id;
        const { role } = req.body;

        if (!['MEMBER', 'CO_CAPTAIN'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Role must be MEMBER or CO_CAPTAIN' });
        }

        const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
        if (team.captainId !== requesterId) {
            return res.status(403).json({ success: false, message: 'Only captain can change roles' });
        }
        if (targetUserId === team.captainId) {
            return res.status(400).json({ success: false, message: 'Captain role cannot be changed here' });
        }

        await db.update(teamMembers)
            .set({ role })
            .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)));

        res.json({ success: true, message: `Member role updated to ${role}` });
    } catch (error) {
        console.error('Update member role error:', error);
        res.status(500).json({ success: false, message: 'Failed to update member role' });
    }
};
