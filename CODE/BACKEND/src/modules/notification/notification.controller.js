/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const prisma = require('../../config/prisma');

// Get notifications
exports.getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = { userId: req.user.id };
        if (unreadOnly === 'true') where.isRead = false;

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({ where: { userId: req.user.id, isRead: false } })
        ]);

        res.json({
            success: true,
            data: notifications,
            unreadCount,
            pagination: { page: parseInt(page), limit: parseInt(limit), total }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
};

// Mark as read
exports.markAsRead = async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { id: req.params.id, userId: req.user.id },
            data: { isRead: true }
        });

        res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, message: 'Failed' });
    }
};

// Mark all as read
exports.markAllAsRead = async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true }
        });

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ success: false, message: 'Failed' });
    }
};

// Helper: Send notification (used by other modules)
exports.send = async (userId, title, message, type = 'INFO', meta = null) => {
    return prisma.notification.create({
        data: { userId, title, message, type, meta }
    });
};
