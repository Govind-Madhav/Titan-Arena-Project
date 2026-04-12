/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const express = require('express');
const router = express.Router();
const socialController = require('./social.controller');
const { authenticate, authOptional } = require('../../middleware/auth.middleware');
const { uploadCommunityImage } = require('../../middleware/upload.middleware');

// Public Feed (Read-Only for Guests)
router.get('/feed', authOptional, socialController.getFeed);

// Write Access
router.post('/posts', authenticate, socialController.createPost);
router.post('/upload-image', authenticate, uploadCommunityImage, socialController.uploadPostImage);
router.delete('/posts/:postId', authenticate, socialController.deletePost);

module.exports = router;
