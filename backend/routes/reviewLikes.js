/**
 * Routes pour les likes sur les reviews
 */

const express = require('express');
const router = express.Router();
const reviewLikeController = require('../controllers/reviewLikeController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/reviews/{reviewId}/like:
 *   post:
 *     summary: Like ou unlike une review
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Like/unlike réussi
 */
router.post('/:reviewId/like', authenticateToken, reviewLikeController.toggleLike);

/**
 * @swagger
 * /api/reviews/{reviewId}/like-status:
 *   get:
 *     summary: Récupère le statut de like pour une review
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Statut de like
 */
router.get('/:reviewId/like-status', authenticateToken, reviewLikeController.getLikeStatus);

module.exports = router;

