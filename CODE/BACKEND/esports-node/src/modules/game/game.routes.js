const express = require('express');
const router = express.Router();
const gameController = require('./game.controller');

// Public routes (anyone can fetch games)
router.get('/', gameController.getAllGames);
router.get('/:slug', gameController.getGameBySlug);

module.exports = router;
