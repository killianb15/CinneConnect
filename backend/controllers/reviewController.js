/**
 * Contrôleur pour la gestion des reviews (notes et commentaires)
 */

const { pool } = require('../config/database');
const { validationResult } = require('express-validator');
const movieController = require('./movieController');

/**
 * Créer ou mettre à jour une review
 */
const createOrUpdateReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    let { filmId } = req.params;
    const { note, commentaire, tmdbId } = req.body;
    const userId = req.user.id;

    // Si pas d'ID local mais un tmdbId, créer le film depuis les données publiques
    if (!filmId || filmId === 'null' || filmId === 'undefined' || filmId === 'new') {
      if (tmdbId) {
        const createdFilmId = await movieController.createFilmFromPublicData(tmdbId);
        if (createdFilmId) {
          filmId = createdFilmId;
        } else {
          return res.status(404).json({
            error: 'Film non trouvé',
            message: 'Impossible de créer le film depuis les données publiques'
          });
        }
      } else {
        return res.status(400).json({
          error: 'ID de film manquant',
          message: 'Vous devez spécifier un ID de film ou un tmdbId'
        });
      }
    }

    // Vérifier que le film existe
    const [films] = await pool.execute('SELECT id FROM films WHERE id = ?', [filmId]);
    if (films.length === 0) {
      return res.status(404).json({
        error: 'Film non trouvé'
      });
    }

    // Vérifier si une review existe déjà
    const [existingReviews] = await pool.execute(
      'SELECT id FROM reviews WHERE user_id = ? AND film_id = ?',
      [userId, filmId]
    );

    if (existingReviews.length > 0) {
      // Mettre à jour
      await pool.execute(
        `UPDATE reviews 
         SET note = ?, commentaire = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND film_id = ?`,
        [note, commentaire, userId, filmId]
      );
    } else {
      // Créer
      await pool.execute(
        `INSERT INTO reviews (user_id, film_id, note, commentaire)
         VALUES (?, ?, ?, ?)`,
        [userId, filmId, note, commentaire]
      );
    }

    // Mettre à jour la note moyenne du film
    const [avgResult] = await pool.execute(
      'SELECT AVG(note) as moyenne FROM reviews WHERE film_id = ?',
      [filmId]
    );

    await pool.execute(
      'UPDATE films SET note_moyenne = ? WHERE id = ?',
      [avgResult[0].moyenne || 0, filmId]
    );

    res.json({
      message: 'Review enregistrée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la review:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Récupère les reviews d'un utilisateur
 */
const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    const [reviews] = await pool.execute(`
      SELECT r.*, f.titre, f.affiche_url, f.date_sortie
      FROM reviews r
      JOIN films f ON r.film_id = f.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [userId]);

    res.json({
      reviews: reviews.map(review => ({
        id: review.id,
        note: review.note,
        commentaire: review.commentaire,
        createdAt: review.created_at,
        film: {
          id: review.film_id,
          titre: review.titre,
          afficheUrl: review.affiche_url,
          dateSortie: review.date_sortie
        }
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des reviews:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Récupère toutes les reviews récentes (pour la page d'accueil connectée)
 */
const getRecentReviews = async (req, res) => {
  try {
    const [reviews] = await pool.execute(`
      SELECT r.*, u.pseudo, u.photo_url, f.titre, f.affiche_url
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN films f ON r.film_id = f.id
      WHERE r.commentaire IS NOT NULL AND r.commentaire != ''
      ORDER BY r.created_at DESC
      LIMIT 20
    `);

    res.json({
      reviews: reviews.map(review => ({
        id: review.id,
        note: review.note,
        commentaire: review.commentaire,
        createdAt: review.created_at,
        user: {
          pseudo: review.pseudo,
          photoUrl: review.photo_url
        },
        film: {
          id: review.film_id,
          titre: review.titre,
          afficheUrl: review.affiche_url
        }
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des reviews récentes:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

module.exports = {
  createOrUpdateReview,
  getUserReviews,
  getRecentReviews
};

