/**
 * Routes pour les reviews
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');

/**
 * @swagger
 * /api/reviews/film/{filmId}:
 *   post:
 *     summary: Créer ou mettre à jour une review
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filmId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               commentaire:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review enregistrée
 */
router.post(
  '/film/:filmId',
  authenticateToken,
  [
    body('note').optional().isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5'),
    body('commentaire').optional().isLength({ max: 1000 }).withMessage('Le commentaire est trop long'),
    body('tmdbId').optional().isInt().withMessage('tmdbId doit être un entier')
  ],
  reviewController.createOrUpdateReview
);

/**
 * @swagger
 * /api/reviews/my:
 *   get:
 *     summary: Récupère les reviews de l'utilisateur connecté
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des reviews
 */
router.get('/my', authenticateToken, reviewController.getUserReviews);

/**
 * @swagger
 * /api/reviews/recent:
 *   get:
 *     summary: Récupère les reviews récentes
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des reviews récentes
 */
router.get('/recent', authenticateToken, reviewController.getRecentReviews);

module.exports = router;

