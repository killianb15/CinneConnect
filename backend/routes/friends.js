/**
 * Routes pour la gestion des demandes d'amis et des relations d'amitié
 */

const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/users/discover:
 *   get:
 *     summary: Parcourt les profils disponibles
 *     description: Retourne une liste de profils (sauf soi-même et ses amis) avec leur statut d'amitié
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Liste des profils disponibles
 */
router.get('/discover', authenticateToken, friendController.discoverProfiles);

/**
 * @swagger
 * /api/users/friend-requests:
 *   get:
 *     summary: Récupère les demandes d'amis reçues en attente
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des demandes d'amis
 */
router.get('/friend-requests', authenticateToken, friendController.getFriendRequests);

/**
 * @swagger
 * /api/users/friends:
 *   get:
 *     summary: Récupère la liste des amis
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des amis
 */
router.get('/friends', authenticateToken, friendController.getFriends);

/**
 * @swagger
 * /api/users/{userId}/friend-request:
 *   post:
 *     summary: Envoie une demande d'ami
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Demande d'ami envoyée
 *       400:
 *         description: Erreur (déjà ami, demande déjà envoyée)
 *       404:
 *         description: Utilisateur non trouvé
 */
router.post('/:userId/friend-request', authenticateToken, friendController.sendFriendRequest);

/**
 * @swagger
 * /api/users/{userId}/friend-request/accept:
 *   post:
 *     summary: Accepte une demande d'ami
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Demande acceptée
 *       404:
 *         description: Demande non trouvée
 */
router.post('/:userId/friend-request/accept', authenticateToken, friendController.acceptFriendRequest);

/**
 * @swagger
 * /api/users/{userId}/friend-request/reject:
 *   post:
 *     summary: Refuse une demande d'ami
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Demande refusée
 *       404:
 *         description: Demande non trouvée
 */
router.post('/:userId/friend-request/reject', authenticateToken, friendController.rejectFriendRequest);

module.exports = router;

