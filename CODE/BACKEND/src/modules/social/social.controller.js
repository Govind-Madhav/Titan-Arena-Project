/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { posts, users, playerProfiles, hostProfiles, blockedUsers } = require('../../db/schema');
const { eq, desc, and, isNull, sql, notInArray } = require('drizzle-orm');

// 1. Create Post
const createPost = async (req, res) => {
    try {
        const userId = req.user.id;
        const { content, mediaUrl, type = 'GENERAL' } = req.body;

        if (!content && !mediaUrl) {
            return res.status(400).json({ success: false, message: 'Content or media is required' });
        }

        const newPost = {
            userId,
            content: content || '',
            mediaUrl,
            type,
            likesCount: 0,
            isDeleted: false
        };

        const result = await db.insert(posts).values(newPost).returning({ id: posts.id });

        res.status(201).json({ success: true, message: 'Post created', postId: result[0]?.id || 'created' });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ success: false, message: 'Failed to create post' });
    }
};

// 2. Get Feed (Global for now, can be followers-only later)
const getFeed = async (req, res) => {
    try {
        const conditions = [eq(posts.isDeleted, false)];

        // Privacy: Filter Blocked Users if Authenticated
        if (req.user) {
            const currentUserId = req.user.id;

            // 1. Exclude posts from users who BLOCKED ME (I am blockedId)
            const blockersQuery = db.select({ id: blockedUsers.blockerId })
                .from(blockedUsers)
                .where(eq(blockedUsers.blockedId, currentUserId));

            // 2. Exclude posts from users I BLOCKED (I am blockerId)
            const blockedQuery = db.select({ id: blockedUsers.blockedId })
                .from(blockedUsers)
                .where(eq(blockedUsers.blockerId, currentUserId));

            conditions.push(
                notInArray(posts.userId, blockersQuery),
                notInArray(posts.userId, blockedQuery)
            );
        }

        const feed = await db.select({
            id: posts.id,
            content: posts.content,
            mediaUrl: posts.mediaUrl,
            type: posts.type,
            likesCount: posts.likesCount,
            createdAt: posts.createdAt,
            // User Info
            userId: users.id, // Explicitly select for frontend key
            username: sql`COALESCE(${playerProfiles.ign}, ${users.username})`, // Prefer IGN for display
            avatarUrl: playerProfiles.avatarUrl,
            role: users.role,
            isHost: sql`CASE WHEN ${hostProfiles.status} = 'ACTIVE' THEN TRUE ELSE FALSE END`, // Proper Derived Flag
            hostCode: hostProfiles.hostCode,
            // Check if post is deleted
            isDeleted: posts.isDeleted
        })
            .from(posts)
            .innerJoin(users, eq(posts.userId, users.id))
            .leftJoin(playerProfiles, eq(users.id, playerProfiles.userId))
            .leftJoin(hostProfiles, eq(users.id, hostProfiles.userId)) // New Join
            .where(and(...conditions))
            .orderBy(desc(posts.createdAt))
            .limit(50); // Hard limit for MVP

        res.json({ success: true, data: feed });
    } catch (error) {
        console.error('Fetch feed error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch feed' });
    }
};

// 3. Delete Post
const deletePost = async (req, res) => {
    try {
        const userId = req.user.id;
        const { postId } = req.params;

        // Check ownership
        const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
        if (!post[0]) return res.status(404).json({ success: false, message: 'Post not found' });

        // Allow Owner, Admin, or Super Admin
        const isOwner = post[0].userId === userId;
        const isAdminOrSuperAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN';

        if (!isOwner && !isAdminOrSuperAdmin) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await db.update(posts)
            .set({ isDeleted: true })
            .where(eq(posts.id, postId));

        res.json({ success: true, message: 'Post deleted' });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete post' });
    }
};

// Upload Image for Post
const uploadPostImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file provided' });
        }

        const mediaUrl = `/uploads/community/${req.file.filename}`;

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            data: { mediaUrl }
        });
    } catch (error) {
        console.error('Upload image error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload image' });
    }
};

module.exports = {
    createPost,
    getFeed,
    deletePost,
    uploadPostImage
};
