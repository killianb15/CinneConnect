/**
 * Contrôleur pour la gestion des likes sur les reviews
 */

const { pool } = require('../config/database');

/**
 * Like ou unlike une review
 * @route POST /api/reviews/:reviewId/like
 */
const toggleLike = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    // Vérifier que la review existe
    const [reviews] = await pool.execute('SELECT id FROM reviews WHERE id = ?', [reviewId]);
    if (reviews.length === 0) {
      return res.status(404).json({
        error: 'Review non trouvée'
      });
    }

    // Vérifier si déjà liké
    const [existingLike] = await pool.execute(
      'SELECT id FROM review_likes WHERE review_id = ? AND user_id = ?',
      [reviewId, userId]
    );

    if (existingLike.length > 0) {
      // Unlike
      await pool.execute(
        'DELETE FROM review_likes WHERE review_id = ? AND user_id = ?',
        [reviewId, userId]
      );

      // Compter les likes restants
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) as total FROM review_likes WHERE review_id = ?',
        [reviewId]
      );

      res.json({
        message: 'Like retiré',
        liked: false,
        likesCount: countResult[0].total
      });
    } else {
      // Like
      await pool.execute(
        'INSERT INTO review_likes (review_id, user_id) VALUES (?, ?)',
        [reviewId, userId]
      );

      // Compter les likes
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) as total FROM review_likes WHERE review_id = ?',
        [reviewId]
      );

      res.json({
        message: 'Review likée',
        liked: true,
        likesCount: countResult[0].total
      });
    }
  } catch (error) {
    console.error('Erreur lors du like/unlike:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Récupère le statut de like pour une review
 * @route GET /api/reviews/:reviewId/like-status
 */
const getLikeStatus = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    // Vérifier si l'utilisateur a liké cette review
    const [likes] = await pool.execute(
      'SELECT COUNT(*) as total FROM review_likes WHERE review_id = ? AND user_id = ?',
      [reviewId, userId]
    );

    // Compter le nombre total de likes
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM review_likes WHERE review_id = ?',
      [reviewId]
    );

    res.json({
      liked: likes[0].total > 0,
      likesCount: countResult[0].total
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du statut de like:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

module.exports = {
  toggleLike,
  getLikeStatus
};

