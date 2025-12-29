/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { posts, users, playerProfiles } = require('../../db/schema');
const { eq, desc, and, isNull } = require('drizzle-orm');

// 1. Create Post
const createPost = async (req, res) => {
    try {
        const userId = req.user.id;
        const { content, mediaUrl, type = 'GENERAL' } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, message: 'Content is required' });
        }

        await db.insert(posts).values({
            userId,
            content,
            mediaUrl,
            type
        });

        res.status(201).json({ success: true, message: 'Post created successfully' });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ success: false, message: 'Failed to create post' });
    }
};

// 2. Get Feed (Global for now, can be followers-only later)
const getFeed = async (req, res) => {
    try {
        const feed = await db.select({
            id: posts.id,
            content: posts.content,
            mediaUrl: posts.mediaUrl,
            type: posts.type,
            likesCount: posts.likesCount,
            createdAt: posts.createdAt,
            // User Info
            username: users.username,
            avatarUrl: playerProfiles.avatarUrl,
            role: users.role,
            isHost: users.hostStatus === 'VERIFIED' ? true : false,
            // Check if post is deleted
            isDeleted: posts.isDeleted // though we filter below
        })
            .from(posts)
            .innerJoin(users, eq(posts.userId, users.id))
            .leftJoin(playerProfiles, eq(users.id, playerProfiles.userId))
            .where(eq(posts.isDeleted, false))
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

        // Allow Admin or Owner
        if (post[0].userId !== userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await db.update(posts)
            .set({ isDeleted: true })
            .where(eq(posts.id, postId));

        res.json({ success: true, message: 'Post deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete post' });
    }
};

module.exports = {
    createPost,
    getFeed,
    deletePost
};
