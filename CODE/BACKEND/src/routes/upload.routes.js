/**
 * Upload routes for file handling
 */

const express = require('express')
const router = express.Router()
const { uploadAvatar, uploadHighlight, uploadCommunityImage, deleteFile } = require('../middleware/upload.middleware')
const { authRequired } = require('../middleware/auth.middleware')
const { db } = require('../db')
const { users } = require('../db/schema')
const { eq } = require('drizzle-orm')
const path = require('path')
const fs = require('fs')

/**
 * Upload avatar
 * POST /upload/avatar
 */
router.post('/avatar', authRequired, (req, res) => {
    uploadAvatar(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || 'Failed to upload avatar'
            })
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            })
        }

        try {
            const userId = req.user.id
            const avatarUrl = `/uploads/avatars/${req.file.filename}`

            // Get old avatar to delete
            const [user] = await db.select().from(users).where(eq(users.id, userId))

            // Update user avatar in database
            await db.update(users)
                .set({ avatarUrl })
                .where(eq(users.id, userId))

            // Delete old avatar if exists and is not default
            if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/')) {
                const oldPath = path.join(__dirname, '../../', user.avatarUrl)
                deleteFile(oldPath)
            }

            res.json({
                success: true,
                message: 'Avatar uploaded successfully',
                data: { avatarUrl }
            })
        } catch (error) {
            console.error('Avatar upload error:', error)

            // Delete uploaded file on error
            if (req.file) {
                deleteFile(req.file.path)
            }

            res.status(500).json({
                success: false,
                message: 'Failed to save avatar'
            })
        }
    })
})

/**
 * Upload tournament highlight
 * POST /upload/highlight
 */
router.post('/highlight', authRequired, (req, res) => {
    uploadHighlight(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || 'Failed to upload highlight'
            })
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            })
        }

        try {
            const highlightUrl = `/uploads/highlights/${req.file.filename}`

            res.json({
                success: true,
                message: 'Highlight uploaded successfully',
                data: {
                    highlightUrl,
                    filename: req.file.filename,
                    size: req.file.size
                }
            })
        } catch (error) {
            console.error('Highlight upload error:', error)

            // Delete uploaded file on error
            if (req.file) {
                deleteFile(req.file.path)
            }

            res.status(500).json({
                success: false,
                message: 'Failed to save highlight'
            })
        }
    })
})

/**
 * Upload community image
 * POST /upload/community
 */
router.post('/community', authRequired, (req, res) => {
    uploadCommunityImage(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || 'Failed to upload image'
            })
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            })
        }

        try {
            const imageUrl = `/uploads/community/${req.file.filename}`

            res.json({
                success: true,
                message: 'Image uploaded successfully',
                data: {
                    imageUrl,
                    filename: req.file.filename,
                    size: req.file.size
                }
            })
        } catch (error) {
            console.error('Community image upload error:', error)

            // Delete uploaded file on error
            if (req.file) {
                deleteFile(req.file.path)
            }

            res.status(500).json({
                success: false,
                message: 'Failed to save image'
            })
        }
    })
})

/**
 * Delete file
 * DELETE /upload/:type/:filename
 */
router.delete('/:type/:filename', authRequired, async (req, res) => {
    try {
        const { type, filename } = req.params
        const allowedTypes = ['avatars', 'highlights', 'community']

        if (!allowedTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file type'
            })
        }

        const filePath = path.join(__dirname, '../../uploads', type, filename)

        // Security check: ensure file belongs to user (for avatars)
        if (type === 'avatars') {
            const [user] = await db.select().from(users).where(eq(users.id, req.user.id))
            if (!user.avatarUrl || !user.avatarUrl.includes(filename)) {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized to delete this file'
                })
            }
        }

        deleteFile(filePath)

        res.json({
            success: true,
            message: 'File deleted successfully'
        })
    } catch (error) {
        console.error('Delete file error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to delete file'
        })
    }
})

module.exports = router
