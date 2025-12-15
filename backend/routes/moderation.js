/**
 * Routes pour la modération du contenu
 */

const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/moderation/report:
 *   post:
 *     summary: Signale un contenu
 *     tags: [Modération]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contentType
 *               - contentId
 *             properties:
 *               contentType:
 *                 type: string
 *                 enum: [review, comment_reply, group_message, user]
 *               contentId:
 *                 type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contenu signalé
 */
router.post('/report', authenticateToken, moderationController.reportContent);

/**
 * @swagger
 * /api/moderation/reports:
 *   get:
 *     summary: Récupère la liste des signalements (modérateurs/admins)
 *     tags: [Modération]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, reviewed, resolved, dismissed]
 *           default: pending
 *     responses:
 *       200:
 *         description: Liste des signalements
 */
router.get('/reports', authenticateToken, moderationController.getReports);

/**
 * @swagger
 * /api/moderation/reports/{reportId}/action:
 *   post:
 *     summary: Traite un signalement
 *     tags: [Modération]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
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
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [delete, warn, ban, no_action]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Signalement traité
 */
router.post('/reports/:reportId/action', authenticateToken, moderationController.handleReport);

module.exports = router;

