/**
 * File upload utility using local backend storage
 * Handles avatars, highlights, and community images
 */

import api from './api'

// File validation constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

/**
 * Validate file type and size
 */
const validateFile = (file, type = 'image') => {
    const allowedTypes = type === 'video' ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES
    const maxSize = type === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE

    if (!allowedTypes.includes(file.type)) {
        throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`)
    }

    if (file.size > maxSize) {
        const sizeMB = (maxSize / (1024 * 1024)).toFixed(0)
        throw new Error(`File too large. Maximum size: ${sizeMB}MB`)
    }

    return true
}

/**
 * Upload file to backend with progress tracking
 * @param {File} file - File to upload
 * @param {string} endpoint - Upload endpoint (e.g., '/upload/avatar')
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} File URL
 */
const uploadFile = async (file, endpoint, onProgress = null) => {
    const formData = new FormData()
    const fieldName = endpoint.includes('avatar') ? 'avatar' :
        endpoint.includes('highlight') ? 'highlight' : 'image'
    formData.append(fieldName, file)

    try {
        const response = await api.post(endpoint, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = (progressEvent.loaded / progressEvent.total) * 100
                    onProgress(progress)
                }
            }
        })

        if (response.data.success) {
            // Return full URL (backend returns relative path)
            const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5001'
            return baseURL + response.data.data.avatarUrl ||
                baseURL + response.data.data.highlightUrl ||
                baseURL + response.data.data.imageUrl
        } else {
            throw new Error(response.data.message || 'Upload failed')
        }
    } catch (error) {
        console.error('Upload error:', error)
        throw new Error(error.response?.data?.message || 'Upload failed. Please try again.')
    }
}

/**
 * Upload profile avatar
 * @param {File} file - Image file
 * @param {string} userId - User ID (not used in local storage, kept for compatibility)
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string>} File URL
 */
export const uploadAvatar = async (file, userId, onProgress = null) => {
    validateFile(file, 'image')
    return uploadFile(file, '/upload/avatar', onProgress)
}

/**
 * Upload tournament highlight video
 * @param {File} file - Video file
 * @param {string} tournamentId - Tournament ID (not used in local storage, kept for compatibility)
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string>} File URL
 */
export const uploadHighlight = async (file, tournamentId, onProgress = null) => {
    validateFile(file, 'video')
    return uploadFile(file, '/upload/highlight', onProgress)
}

/**
 * Upload community post image
 * @param {File} file - Image file
 * @param {string} postId - Post ID (not used in local storage, kept for compatibility)
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string>} File URL
 */
export const uploadCommunityImage = async (file, postId, onProgress = null) => {
    validateFile(file, 'image')
    return uploadFile(file, '/upload/community', onProgress)
}

/**
 * Delete file from server
 * @param {string} fileUrl - Full file URL
 * @returns {Promise<void>}
 */
export const deleteFile = async (fileUrl) => {
    try {
        // Extract path from URL
        const url = new URL(fileUrl)
        const pathParts = url.pathname.split('/')
        const type = pathParts[pathParts.length - 2] // 'avatars', 'highlights', or 'community'
        const filename = pathParts[pathParts.length - 1]

        await api.delete(`/upload/${type}/${filename}`)
    } catch (error) {
        console.error('Delete error:', error)
        throw new Error('Failed to delete file')
    }
}

/**
 * Get file size in human-readable format
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
