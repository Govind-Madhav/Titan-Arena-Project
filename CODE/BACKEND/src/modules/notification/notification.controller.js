/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { notifications } = require('../../db/schema');
const { eq, and, desc, count } = require('drizzle-orm');

// Get notifications
exports.getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const conditions = [eq(notifications.userId, req.user.id)];
        if (unreadOnly === 'true') {
            conditions.push(eq(notifications.isRead, false));
        }

        // Parallel queries for data and counts
        const [data, totalResult, unreadResult] = await Promise.all([
            db.select()
                .from(notifications)
                .where(and(...conditions))
                .orderBy(desc(notifications.createdAt))
                .limit(take)
                .offset(skip),
            db.select({ count: count() })
                .from(notifications)
                .where(and(...conditions)),
            db.select({ count: count() })
                .from(notifications)
                .where(and(eq(notifications.userId, req.user.id), eq(notifications.isRead, false)))
        ]);

        const total = totalResult[0]?.count || 0;
        const unreadCount = unreadResult[0]?.count || 0;

        res.json({
            success: true,
            data,
            unreadCount,
            pagination: { page: parseInt(page), limit: take, total }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
};

// Mark as read
exports.markAsRead = async (req, res) => {
    try {
        await db.update(notifications)
            .set({ isRead: true })
            .where(and(
                eq(notifications.id, req.params.id),
                eq(notifications.userId, req.user.id)
            ));

        res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, message: 'Failed' });
    }
};

// Mark all as read
exports.markAllAsRead = async (req, res) => {
    try {
        await db.update(notifications)
            .set({ isRead: true })
            .where(and(
                eq(notifications.userId, req.user.id),
                eq(notifications.isRead, false)
            ));

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ success: false, message: 'Failed' });
    }
};

// Helper: Send notification (used by other modules)
exports.send = async (userId, title, message, type = 'INFO', meta = null) => {
    // Note: Drizzle insert returns result object, not the created record by default in MySQL
    // But since this is an internal helper, returning the promise resolution is usually fine
    // Or we can query the inserted record if needed. Here we just await insertion.
    const metaString = meta ? JSON.stringify(meta) : null;
    return db.insert(notifications).values({
        userId,
        title,
        message,
        type,
        meta: metaString
    });
};
