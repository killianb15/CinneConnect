/**
 * Routes pour les films
 */

const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/movies/latest:
 *   get:
 *     summary: Récupère les derniers films
 *     tags: [Films]
 *     responses:
 *       200:
 *         description: Liste des derniers films
 */
router.get('/latest', movieController.getLatestMovies);

/**
 * @swagger
 * /api/movies/search:
 *   get:
 *     summary: Recherche des films par titre
 *     tags: [Films]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Terme de recherche
 *     responses:
 *       200:
 *         description: Liste des films correspondants
 */
router.get('/search', movieController.searchMovies);

/**
 * @swagger
 * /api/movies:
 *   post:
 *     summary: Crée un film manuellement
 *     tags: [Films]
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
 *               titreOriginal:
 *                 type: string
 *               synopsis:
 *                 type: string
 *               dateSortie:
 *                 type: string
 *                 format: date
 *               duree:
 *                 type: integer
 *               afficheUrl:
 *                 type: string
 *               realisateur:
 *                 type: string
 *               genres:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Film créé avec succès
 *       400:
 *         description: Données invalides
 *       409:
 *         description: Film déjà existant
 */
router.post('/', authenticateToken, movieController.createMovie);

/**
 * @swagger
 * /api/movies/{id}:
 *   get:
 *     summary: Récupère les détails d'un film
 *     tags: [Films]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails du film
 *       404:
 *         description: Film non trouvé
 */
router.get('/:id', movieController.getMovieDetails);

module.exports = router;

