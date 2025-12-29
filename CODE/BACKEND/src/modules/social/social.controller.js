/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { posts, users, playerProfiles, hostProfiles } = require('../../db/schema');
const { eq, desc, and, isNull, sql } = require('drizzle-orm');

// 1. Create Post
const createPost = async (req, res) => {
    try {
        const userId = req.user.id;
        const { content, mediaUrl, type = 'GENERAL' } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, message: 'Content is required' });
        }

        // Strict Check: TOURNAMENT_UPDATE only for Hosts
        if (type === 'TOURNAMENT_UPDATE') {
            const hostProfile = await db.select()
                .from(hostProfiles)
                .where(eq(hostProfiles.userId, userId))
                .limit(1);

            if (!hostProfile[0] || hostProfile[0].status !== 'ACTIVE') {
                return res.status(403).json({ success: false, message: 'Only active Hosts can post Tournament Updates.' });
            }
        }

        await db.insert(posts).values({
            userId,
            content,
            mediaUrl,
            type,
            // likesCount defaults to 0
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
