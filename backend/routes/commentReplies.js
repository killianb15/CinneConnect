/**
 * Routes pour les réponses aux commentaires
 */

const express = require('express');
const router = express.Router();
const commentReplyController = require('../controllers/commentReplyController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/reviews/{reviewId}/replies:
 *   post:
 *     summary: Crée une réponse à un commentaire
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Réponse créée
 */
router.post('/:reviewId/replies', authenticateToken, commentReplyController.createReply);

/**
 * @swagger
 * /api/reviews/{reviewId}/replies:
 *   get:
 *     summary: Récupère les réponses d'un commentaire
 *     tags: [Interactions]
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des réponses
 */
router.get('/:reviewId/replies', commentReplyController.getReplies);

module.exports = router;

