/**
 * Routes pour les groupes thématiques
 */

const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const groupMessageController = require('../controllers/groupMessageController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Récupère tous les groupes accessibles
 *     tags: [Groupes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des groupes
 */
router.get('/', authenticateToken, groupController.getGroups);

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Crée un nouveau groupe
 *     tags: [Groupes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titre
 *             properties:
 *               titre:
 *                 type: string
 *               description:
 *                 type: string
 *               imageCouverture:
 *                 type: string
 *               thematique:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Groupe créé
 */
router.post('/', authenticateToken, groupController.createGroup);

/**
 * @swagger
 * /api/groups/{groupId}/messages:
 *   get:
 *     summary: Récupère tous les messages d'un groupe
 *     tags: [Groupes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des messages
 */
router.get('/:groupId/messages', authenticateToken, groupMessageController.getGroupMessages);

/**
 * @swagger
 * /api/groups/{groupId}/messages:
 *   post:
 *     summary: Crée un nouveau message dans un groupe
 *     tags: [Groupes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
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
 *         description: Message créé
 */
router.post('/:groupId/messages', authenticateToken, groupMessageController.createGroupMessage);

/**
 * @swagger
 * /api/groups/{groupId}:
 *   get:
 *     summary: Récupère les détails d'un groupe
 *     tags: [Groupes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails du groupe
 */
router.get('/:groupId', authenticateToken, groupController.getGroupDetails);

/**
 * @swagger
 * /api/groups/{groupId}:
 *   put:
 *     summary: Met à jour un groupe
 *     tags: [Groupes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Groupe mis à jour
 */
router.put('/:groupId', authenticateToken, groupController.updateGroup);

/**
 * @swagger
 * /api/groups/{groupId}:
 *   delete:
 *     summary: Supprime un groupe
 *     tags: [Groupes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Groupe supprimé
 */
router.delete('/:groupId', authenticateToken, groupController.deleteGroup);

/**
 * @swagger
 * /api/groups/{groupId}/join:
 *   post:
 *     summary: Rejoint un groupe public
 *     tags: [Groupes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Groupe rejoint
 */
router.post('/:groupId/join', authenticateToken, groupController.joinGroup);

/**
 * @swagger
 * /api/groups/{groupId}/leave:
 *   post:
 *     summary: Quitte un groupe
 *     tags: [Groupes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Groupe quitté
 */
router.post('/:groupId/leave', authenticateToken, groupController.leaveGroup);

/**
 * @swagger
 * /api/groups/{groupId}/invite:
 *   post:
 *     summary: Invite un utilisateur à rejoindre un groupe
 *     tags: [Groupes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
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
 *               - inviteEmail
 *             properties:
 *               inviteEmail:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation envoyée
 */
router.post('/:groupId/invite', authenticateToken, groupController.inviteToGroup);

/**
 * @swagger
 * /api/groups/{groupId}/films:
 *   post:
 *     summary: Ajoute un film à un groupe
 *     tags: [Groupes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
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
 *               - filmId
 *             properties:
 *               filmId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Film ajouté
 */
router.post('/:groupId/films', authenticateToken, groupController.addFilmToGroup);

module.exports = router;


