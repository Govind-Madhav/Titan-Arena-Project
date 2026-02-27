/**
 * Multer configuration for file uploads
 * Handles avatars, highlights, and community images
 */

const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Ensure upload directories exist
const uploadDirs = {
    avatars: path.join(__dirname, '../../uploads/avatars'),
    highlights: path.join(__dirname, '../../uploads/highlights'),
    community: path.join(__dirname, '../../uploads/community'),
    temp: path.join(__dirname, '../../uploads/temp')
}

Object.values(uploadDirs).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
})

// File filter for images
const imageFilter = (req, file, cb) => {
    // ❌ Deny-list: block dangerous extensions regardless of MIME type
    const dangerousExts = /\.(svg|html|htm|php|js|ts|sh|exe|bat|py|rb)$/i
    if (dangerousExts.test(file.originalname)) {
        return cb(new Error('File type not permitted for security reasons'))
    }

    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
        return cb(null, true)
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'))
    }
}

// File filter for videos
const videoFilter = (req, file, cb) => {
    const allowedTypes = /mp4|webm|mov/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
        return cb(null, true)
    } else {
        cb(new Error('Only video files are allowed (mp4, webm, mov)'))
    }
}

// Storage configuration for avatars
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirs.avatars)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname))
    }
})

// Storage configuration for highlights
const highlightStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirs.highlights)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'highlight-' + uniqueSuffix + path.extname(file.originalname))
    }
})

// Storage configuration for community images
const communityStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirs.community)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'community-' + uniqueSuffix + path.extname(file.originalname))
    }
})

// Multer instances
const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFilter
}).single('avatar')

const uploadHighlight = multer({
    storage: highlightStorage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: videoFilter
}).single('highlight')

const uploadCommunityImage = multer({
    storage: communityStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFilter
}).single('image')

// Helper function to delete old file
const deleteFile = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
    } catch (error) {
        console.error('Error deleting file:', error)
    }
}

module.exports = {
    uploadAvatar,
    uploadHighlight,
    uploadCommunityImage,
    deleteFile,
    uploadDirs
}
