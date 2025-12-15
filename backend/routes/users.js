/**
 * Routes pour les utilisateurs et profils
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Met à jour le profil de l'utilisateur connecté
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pseudo:
 *                 type: string
 *               bio:
 *                 type: string
 *               photoUrl:
 *                 type: string
 *               genresPreferences:
 *                 type: array
 *     responses:
 *       200:
 *         description: Profil mis à jour
 */
router.put('/me', authenticateToken, userController.updateProfile);

/**
 * @swagger
 * /api/users/favorites/{filmId}:
 *   post:
 *     summary: Ajoute un film aux favoris
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filmId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Film ajouté aux favoris
 *       400:
 *         description: Film déjà en favoris ou limite atteinte
 *       404:
 *         description: Film non trouvé
 */
router.post('/favorites/:filmId', authenticateToken, userController.addFavoriteFilm);

/**
 * @swagger
 * /api/users/favorites/{filmId}:
 *   delete:
 *     summary: Retire un film des favoris
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filmId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Film retiré des favoris
 *       404:
 *         description: Film non trouvé dans les favoris
 */
router.delete('/favorites/:filmId', authenticateToken, userController.removeFavoriteFilm);

/**
 * @swagger
 * /api/users/{userId}/profile:
 *   get:
 *     summary: Récupère le profil d'un utilisateur
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
 *         description: Profil récupéré
 *       404:
 *         description: Utilisateur non trouvé
 */
router.get('/:userId/profile', optionalAuth, userController.getUserProfile);

/**
 * @swagger
 * /api/users/{userId}/groups:
 *   get:
 *     summary: Récupère les groupes d'un utilisateur
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
 *         description: Liste des groupes
 */
router.get('/:userId/groups', authenticateToken, userController.getUserGroups);

/**
 * @swagger
 * /api/users/{userId}/follow:
 *   post:
 *     summary: Suit un utilisateur
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
 *         description: Utilisateur suivi avec succès
 *       400:
 *         description: Déjà suivi ou tentative de se suivre soi-même
 */
router.post('/:userId/follow', authenticateToken, userController.followUser);

/**
 * @swagger
 * /api/users/{userId}/follow:
 *   delete:
 *     summary: Ne suit plus un utilisateur
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
 *         description: Suivi arrêté avec succès
 *       400:
 *         description: Ne suit pas cet utilisateur
 */
router.delete('/:userId/follow', authenticateToken, userController.unfollowUser);

module.exports = router;

