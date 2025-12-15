/**
 * Routes pour le fil d'actualité
 */

const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/feed:
 *   get:
 *     summary: Récupère le fil d'actualité
 *     description: Retourne les reviews récentes de tous les utilisateurs
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fil d'actualité récupéré avec succès
 *       401:
 *         description: Non authentifié
 */
// Fil d'actualité global (accessible sans authentification)
router.get('/global', feedController.getGlobalFeed);

// Fil d'actualité des amis (nécessite authentification)
router.get('/', authenticateToken, feedController.getFeed);

module.exports = router;


