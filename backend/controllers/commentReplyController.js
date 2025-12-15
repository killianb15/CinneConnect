/**
 * Contrôleur pour la gestion des réponses aux commentaires
 */

const { pool } = require('../config/database');

/**
 * Crée une réponse à un commentaire (review)
 * @route POST /api/reviews/:reviewId/replies
 */
const createReply = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Le message ne peut pas être vide'
      });
    }

    // Vérifier que la review existe
    const [reviews] = await pool.execute('SELECT id FROM reviews WHERE id = ?', [reviewId]);
    if (reviews.length === 0) {
      return res.status(404).json({
        error: 'Review non trouvée'
      });
    }

    // Créer la réponse
    const [result] = await pool.execute(
      'INSERT INTO comment_replies (parent_review_id, user_id, message) VALUES (?, ?, ?)',
      [reviewId, userId, message.trim()]
    );

    // Récupérer la réponse créée avec les infos de l'utilisateur
    const [reply] = await pool.execute(`
      SELECT 
        cr.id,
        cr.parent_review_id,
        cr.message,
        cr.created_at,
        u.id as user_id,
        u.pseudo,
        u.photo_url
      FROM comment_replies cr
      JOIN users u ON cr.user_id = u.id
      WHERE cr.id = ?
    `, [result.insertId]);

    res.status(201).json({
      reply: {
        id: reply[0].id,
        parentReviewId: reply[0].parent_review_id,
        message: reply[0].message,
        createdAt: reply[0].created_at,
        user: {
          id: reply[0].user_id,
          pseudo: reply[0].pseudo,
          photoUrl: reply[0].photo_url
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création de la réponse:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Récupère les réponses d'un commentaire
 * @route GET /api/reviews/:reviewId/replies
 */
const getReplies = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const [replies] = await pool.execute(`
      SELECT 
        cr.id,
        cr.parent_review_id,
        cr.message,
        cr.created_at,
        u.id as user_id,
        u.pseudo,
        u.photo_url
      FROM comment_replies cr
      JOIN users u ON cr.user_id = u.id
      WHERE cr.parent_review_id = ?
      ORDER BY cr.created_at ASC
    `, [reviewId]);

    const formattedReplies = replies.map(reply => ({
      id: reply.id,
      parentReviewId: reply.parent_review_id,
      message: reply.message,
      createdAt: reply.created_at,
      user: {
        id: reply.user_id,
        pseudo: reply.pseudo,
        photoUrl: reply.photo_url
      }
    }));

    res.json({
      replies: formattedReplies,
      total: formattedReplies.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des réponses:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Supprime une réponse (seulement par son auteur ou un modérateur)
 * @route DELETE /api/replies/:replyId
 */
const deleteReply = async (req, res) => {
  try {
    const { replyId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Vérifier que la réponse existe et récupérer l'auteur
    const [replies] = await pool.execute(
      'SELECT user_id FROM comment_replies WHERE id = ?',
      [replyId]
    );

    if (replies.length === 0) {
      return res.status(404).json({
        error: 'Réponse non trouvée'
      });
    }

    // Vérifier les permissions (auteur ou modérateur/admin)
    if (replies[0].user_id !== userId && userRole !== 'moderateur' && userRole !== 'admin') {
      return res.status(403).json({
        error: 'Permission refusée',
        message: 'Vous ne pouvez supprimer que vos propres réponses'
      });
    }

    await pool.execute('DELETE FROM comment_replies WHERE id = ?', [replyId]);

    res.json({
      message: 'Réponse supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la réponse:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

module.exports = {
  createReply,
  getReplies,
  deleteReply
};

