/**
 * Routes pour supprimer les réponses aux commentaires
 */

const express = require('express');
const router = express.Router();
const commentReplyController = require('../controllers/commentReplyController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/replies/{replyId}:
 *   delete:
 *     summary: Supprime une réponse
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: replyId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Réponse supprimée
 */
router.delete('/:replyId', authenticateToken, commentReplyController.deleteReply);

module.exports = router;

