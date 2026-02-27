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
        res.status(500).json({ success: false, message: 'Failed to fetch clans' });
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

// ─── Leave Clan ───────────────────────────────────────────────────────────────
router.delete('/:id/leave', authenticate, async (req, res) => {
    try {
        const clanRows = await db.select().from(clans).where(eq(clans.id, req.params.id));
        if (!clanRows.length) return res.status(404).json({ success: false, message: 'Clan not found' });

        const memberRows = await db.select().from(clanMembers)
            .where(and(eq(clanMembers.clanId, req.params.id), eq(clanMembers.userId, req.user.id)));

        if (!memberRows.length) return res.status(400).json({ success: false, message: 'You are not in this clan' });
        if (memberRows[0].role === 'OWNER') return res.status(400).json({ success: false, message: 'Clan owner cannot leave. Delete the clan instead.' });

        await db.delete(clanMembers)
            .where(and(eq(clanMembers.clanId, req.params.id), eq(clanMembers.userId, req.user.id)));

        res.json({ success: true, message: 'Left the clan' });
    } catch (err) {
        console.error('Leave clan error:', err);
        res.status(500).json({ success: false, message: 'Failed to leave clan' });
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
