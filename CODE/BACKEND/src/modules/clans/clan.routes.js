/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 *
 * Clan / Organisation System — Phase D6
 * Allows players to form organisations with tags, banners, and ranks.
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../db');
const { clans, clanMembers, users } = require('../../db/schema');
const { eq, and, desc } = require('drizzle-orm');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { z } = require('zod');

const clanSchema = z.object({
    name: z.string().min(3).max(100),
    tag: z.string().min(2).max(10).regex(/^[A-Z0-9]+$/i, 'Tag must be alphanumeric'),
    description: z.string().max(500).optional(),
    isOpen: z.boolean().optional().default(true),
});

// ─── Create Clan ──────────────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
    try {
        const data = clanSchema.parse(req.body);

        // Check if user is already in a clan
        const existing = await db.select().from(clanMembers).where(eq(clanMembers.userId, req.user.id));
        if (existing.length) {
            return res.status(400).json({ success: false, message: 'You are already in a clan. Leave it before creating a new one.' });
        }

        const [newClan] = await db.insert(clans)
            .values({ ...data, ownerId: req.user.id })
            .returning();

        // Auto-join as OWNER
        await db.insert(clanMembers).values({
            clanId: newClan.id,
            userId: req.user.id,
            role: 'OWNER',
        });

        res.status(201).json({ success: true, message: 'Clan created!', data: newClan });
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
        if (err.code === '23505') return res.status(409).json({ success: false, message: 'Clan name or tag already taken' });
        console.error('Create clan error:', err);
        res.status(500).json({ success: false, message: 'Failed to create clan' });
    }
});

// ─── Get All Clans ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const rows = await db.select().from(clans).orderBy(desc(clans.totalWins)).limit(50);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Fetch clans error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch clans' });
    }
});

// ─── Get MY Clan (must be before /:id to avoid route collision) ───────────────
router.get('/my', authenticate, async (req, res) => {
    try {
        const memberRows = await db.select({ clanId: clanMembers.clanId, role: clanMembers.role, joinedAt: clanMembers.joinedAt })
            .from(clanMembers).where(eq(clanMembers.userId, req.user.id));
        if (!memberRows.length) return res.json({ success: true, data: null });

        const clanRows = await db.select().from(clans).where(eq(clans.id, memberRows[0].clanId));
        if (!clanRows.length) return res.json({ success: true, data: null });

        res.json({ success: true, data: { ...clanRows[0], myRole: memberRows[0].role, joinedAt: memberRows[0].joinedAt } });
    } catch (err) {
        console.error('Get my clan error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch your clan' });
    }
});

// ─── Get Single Clan ──────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const clanRows = await db.select().from(clans).where(eq(clans.id, req.params.id));
        if (!clanRows.length) return res.status(404).json({ success: false, message: 'Clan not found' });

        const members = await db.select({
            userId: clanMembers.userId,
            role: clanMembers.role,
            joinedAt: clanMembers.joinedAt,
            username: users.username,
            avatarUrl: users.avatarUrl,
        })
            .from(clanMembers)
            .leftJoin(users, eq(clanMembers.userId, users.id))
            .where(eq(clanMembers.clanId, req.params.id));

        res.json({ success: true, data: { ...clanRows[0], members } });
    } catch (err) {
        console.error('Fetch clan detail error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch clan' });
    }
});

// ─── Join Clan ────────────────────────────────────────────────────────────────
router.post('/:id/join', authenticate, async (req, res) => {
    try {
        const clanRows = await db.select().from(clans).where(eq(clans.id, req.params.id));
        if (!clanRows.length) return res.status(404).json({ success: false, message: 'Clan not found' });
        const clan = clanRows[0];

        if (!clan.isOpen) {
            return res.status(403).json({ success: false, message: 'This clan is closed. Ask an officer for an invite.' });
        }

        // Check if already in a clan
        const existing = await db.select().from(clanMembers).where(eq(clanMembers.userId, req.user.id));
        if (existing.length) return res.status(400).json({ success: false, message: 'You are already in a clan' });

        await db.insert(clanMembers).values({ clanId: clan.id, userId: req.user.id, role: 'MEMBER' });
        await db.update(clans)
            .set({ membersCount: clan.membersCount + 1, updatedAt: new Date() })
            .where(eq(clans.id, clan.id));

        res.json({ success: true, message: `Joined [${clan.tag}] ${clan.name}!` });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ success: false, message: 'Already a member' });
        console.error('Join clan error:', err);
        res.status(500).json({ success: false, message: 'Failed to join clan' });
    }
});

// ─── Update Clan (owner only) ─────────────────────────────────────────────────
router.patch('/:id', authenticate, async (req, res) => {
    try {
        const clanRows = await db.select().from(clans).where(eq(clans.id, req.params.id));
        if (!clanRows.length) return res.status(404).json({ success: false, message: 'Clan not found' });
        const clan = clanRows[0];

        if (clan.ownerId !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Only the owner can update the clan' });
        }

        const updateSchema = z.object({
            name: z.string().min(3).max(100).optional(),
            description: z.string().max(500).optional(),
            isOpen: z.boolean().optional(),
        });
        const data = updateSchema.parse(req.body);

        const [updated] = await db.update(clans)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(clans.id, req.params.id))
            .returning();

        res.json({ success: true, message: 'Clan updated', data: updated });
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
        console.error('Update clan error:', err);
        res.status(500).json({ success: false, message: 'Failed to update clan' });
    }
});

// ─── Promote / Demote Member (owner only) ────────────────────────────────────
router.patch('/:id/members/:userId', authenticate, async (req, res) => {
    try {
        const clanRows = await db.select().from(clans).where(eq(clans.id, req.params.id));
        if (!clanRows.length) return res.status(404).json({ success: false, message: 'Clan not found' });

        if (clanRows[0].ownerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Only the owner can change member roles' });
        }

        const { role } = req.body;
        if (!['MEMBER', 'OFFICER'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Role must be MEMBER or OFFICER' });
        }

        await db.update(clanMembers)
            .set({ role })
            .where(and(eq(clanMembers.clanId, req.params.id), eq(clanMembers.userId, req.params.userId)));

        res.json({ success: true, message: `Member role updated to ${role}` });
    } catch (err) {
        console.error('Update member role error:', err);
        res.status(500).json({ success: false, message: 'Failed to update member role' });
    }
});

// ─── Leave Clan ───────────────────────────────────────────────────────────────
router.delete('/:id/leave', authenticate, async (req, res) => {
    try {
        const clanRows = await db.select().from(clans).where(eq(clans.id, req.params.id));
        if (!clanRows.length) return res.status(404).json({ success: false, message: 'Clan not found' });
        const clan = clanRows[0];

        const memberRows = await db.select().from(clanMembers)
            .where(and(eq(clanMembers.clanId, req.params.id), eq(clanMembers.userId, req.user.id)));

        if (!memberRows.length) return res.status(400).json({ success: false, message: 'You are not in this clan' });
        if (memberRows[0].role === 'OWNER') return res.status(400).json({ success: false, message: 'Clan owner cannot leave. Disband the clan instead.' });

        await db.delete(clanMembers)
            .where(and(eq(clanMembers.clanId, req.params.id), eq(clanMembers.userId, req.user.id)));
        await db.update(clans)
            .set({ membersCount: Math.max((clan.membersCount ?? 1) - 1, 0), updatedAt: new Date() })
            .where(eq(clans.id, req.params.id));

        res.json({ success: true, message: 'Left the clan' });
    } catch (err) {
        console.error('Leave clan error:', err);
        res.status(500).json({ success: false, message: 'Failed to leave clan' });
    }
});

// ─── Kick Member (owner / officer) ───────────────────────────────────────────
router.delete('/:id/members/:userId', authenticate, async (req, res) => {
    try {
        const clanRows = await db.select().from(clans).where(eq(clans.id, req.params.id));
        if (!clanRows.length) return res.status(404).json({ success: false, message: 'Clan not found' });
        const clan = clanRows[0];

        // Must be owner or officer
        const actorMember = await db.select().from(clanMembers)
            .where(and(eq(clanMembers.clanId, req.params.id), eq(clanMembers.userId, req.user.id)));
        if (!actorMember.length || !['OWNER', 'OFFICER'].includes(actorMember[0].role)) {
            return res.status(403).json({ success: false, message: 'Insufficient permissions to kick' });
        }

        // Can't kick the owner
        if (req.params.userId === clan.ownerId) {
            return res.status(400).json({ success: false, message: 'Cannot kick the clan owner' });
        }

        await db.delete(clanMembers)
            .where(and(eq(clanMembers.clanId, req.params.id), eq(clanMembers.userId, req.params.userId)));
        await db.update(clans)
            .set({ membersCount: Math.max((clan.membersCount ?? 1) - 1, 0), updatedAt: new Date() })
            .where(eq(clans.id, req.params.id));

        res.json({ success: true, message: 'Member kicked' });
    } catch (err) {
        console.error('Kick member error:', err);
        res.status(500).json({ success: false, message: 'Failed to kick member' });
    }
});

// ─── Delete Clan (Owner only) ─────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const clanRows = await db.select().from(clans).where(eq(clans.id, req.params.id));
        if (!clanRows.length) return res.status(404).json({ success: false, message: 'Clan not found' });

        const clan = clanRows[0];
        if (clan.ownerId !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Only the clan owner can delete it' });
        }

        await db.delete(clanMembers).where(eq(clanMembers.clanId, req.params.id));
        await db.delete(clans).where(eq(clans.id, req.params.id));

        res.json({ success: true, message: 'Clan disbanded' });
    } catch (err) {
        console.error('Delete clan error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete clan' });
    }
});

module.exports = router;

