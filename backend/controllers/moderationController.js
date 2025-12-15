/**
 * Contrôleur pour la modération du contenu
 */

const { pool } = require('../config/database');

/**
 * Signale un contenu
 * @route POST /api/moderation/report
 */
const reportContent = async (req, res) => {
  try {
    const { contentType, contentId, reason } = req.body;
    const reporterId = req.user.id;

    if (!contentType || !contentId) {
      return res.status(400).json({
        error: 'Type de contenu et ID requis'
      });
    }

    // Vérifier que le type de contenu est valide
    const validTypes = ['review', 'comment_reply', 'group_message', 'user'];
    if (!validTypes.includes(contentType)) {
      return res.status(400).json({
        error: 'Type de contenu invalide'
      });
    }

    // Vérifier que le contenu existe
    let tableName;
    switch (contentType) {
      case 'review':
        tableName = 'reviews';
        break;
      case 'comment_reply':
        tableName = 'comment_replies';
        break;
      case 'group_message':
        tableName = 'groupe_messages';
        break;
      case 'user':
        tableName = 'users';
        break;
    }

    const [content] = await pool.execute(`SELECT id FROM ${tableName} WHERE id = ?`, [contentId]);
    if (content.length === 0) {
      return res.status(404).json({
        error: 'Contenu non trouvé'
      });
    }

    // Vérifier si déjà signalé par cet utilisateur
    const [existingReport] = await pool.execute(
      'SELECT id FROM reported_content WHERE content_type = ? AND content_id = ? AND reporter_id = ?',
      [contentType, contentId, reporterId]
    );

    if (existingReport.length > 0) {
      return res.status(400).json({
        error: 'Vous avez déjà signalé ce contenu'
      });
    }

    // Créer le signalement
    await pool.execute(
      'INSERT INTO reported_content (content_type, content_id, reporter_id, reason, status) VALUES (?, ?, ?, ?, ?)',
      [contentType, contentId, reporterId, reason || null, 'pending']
    );

    res.status(201).json({
      message: 'Contenu signalé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du signalement:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Récupère la liste des signalements (pour modérateurs/admins)
 * @route GET /api/moderation/reports
 */
const getReports = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Permission refusée',
        message: 'Seuls les administrateurs peuvent accéder au back office'
      });
    }

    const status = req.query.status || 'pending';

    const [reports] = await pool.execute(`
      SELECT 
        rc.id,
        rc.content_type,
        rc.content_id,
        rc.reason,
        rc.status,
        rc.created_at,
        rc.updated_at,
        reporter.id as reporter_id,
        reporter.pseudo as reporter_pseudo,
        moderator.id as moderator_id,
        moderator.pseudo as moderator_pseudo,
        rc.moderator_action,
        rc.moderator_notes
      FROM reported_content rc
      JOIN users reporter ON rc.reporter_id = reporter.id
      LEFT JOIN users moderator ON rc.moderator_id = moderator.id
      WHERE rc.status = ?
      ORDER BY rc.created_at DESC
    `, [status]);

    // Pour chaque signalement, récupérer le contenu signalé
    const formattedReports = await Promise.all(reports.map(async (report) => {
      let contentData = null;

      try {
        switch (report.content_type) {
          case 'review':
            const [reviews] = await pool.execute(`
              SELECT r.*, u.pseudo as user_pseudo, f.titre as film_titre
              FROM reviews r
              JOIN users u ON r.user_id = u.id
              JOIN films f ON r.film_id = f.id
              WHERE r.id = ?
            `, [report.content_id]);
            if (reviews.length > 0) {
              contentData = {
                note: reviews[0].note,
                commentaire: reviews[0].commentaire,
                userPseudo: reviews[0].user_pseudo,
                filmTitre: reviews[0].film_titre,
                createdAt: reviews[0].created_at
              };
            }
            break;
          case 'comment_reply':
            const [replies] = await pool.execute(`
              SELECT cr.*, u.pseudo as user_pseudo
              FROM comment_replies cr
              JOIN users u ON cr.user_id = u.id
              WHERE cr.id = ?
            `, [report.content_id]);
            if (replies.length > 0) {
              contentData = {
                message: replies[0].message,
                userPseudo: replies[0].user_pseudo,
                createdAt: replies[0].created_at
              };
            }
            break;
          case 'group_message':
            const [messages] = await pool.execute(`
              SELECT gm.*, u.pseudo as user_pseudo, g.titre as groupe_titre
              FROM groupe_messages gm
              JOIN users u ON gm.user_id = u.id
              JOIN groupes g ON gm.groupe_id = g.id
              WHERE gm.id = ?
            `, [report.content_id]);
            if (messages.length > 0) {
              contentData = {
                message: messages[0].message,
                userPseudo: messages[0].user_pseudo,
                groupeTitre: messages[0].groupe_titre,
                createdAt: messages[0].created_at
              };
            }
            break;
          case 'user':
            const [users] = await pool.execute(`
              SELECT id, pseudo, email, bio, photo_url
              FROM users
              WHERE id = ?
            `, [report.content_id]);
            if (users.length > 0) {
              contentData = {
                pseudo: users[0].pseudo,
                email: users[0].email,
                bio: users[0].bio,
                photoUrl: users[0].photo_url
              };
            }
            break;
        }
      } catch (err) {
        console.error('Erreur lors de la récupération du contenu:', err);
      }

      return {
        id: report.id,
        contentType: report.content_type,
        contentId: report.content_id,
        content: contentData,
        reason: report.reason,
        status: report.status,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
        reporter: {
          id: report.reporter_id,
          pseudo: report.reporter_pseudo
        },
        moderator: report.moderator_id ? {
          id: report.moderator_id,
          pseudo: report.moderator_pseudo
        } : null,
        moderatorAction: report.moderator_action,
        moderatorNotes: report.moderator_notes
      };
    }));

    res.json({
      reports: formattedReports,
      total: formattedReports.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des signalements:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Traite un signalement (modération)
 * @route POST /api/moderation/reports/:reportId/action
 */
const handleReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action, notes } = req.body;
    const moderatorId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Permission refusée',
        message: 'Seuls les administrateurs peuvent traiter les signalements'
      });
    }

    const validActions = ['delete', 'warn', 'ban', 'no_action'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        error: 'Action invalide'
      });
    }

    // Récupérer le signalement
    const [reports] = await pool.execute(
      'SELECT content_type, content_id FROM reported_content WHERE id = ?',
      [reportId]
    );

    if (reports.length === 0) {
      return res.status(404).json({
        error: 'Signalement non trouvé'
      });
    }

    const report = reports[0];

    // Si action = delete, supprimer le contenu
    if (action === 'delete') {
      let tableName;
      switch (report.content_type) {
        case 'review':
          tableName = 'reviews';
          break;
        case 'comment_reply':
          tableName = 'comment_replies';
          break;
        case 'group_message':
          tableName = 'groupe_messages';
          break;
        default:
          return res.status(400).json({
            error: 'Type de contenu non supprimable'
          });
      }

      await pool.execute(`DELETE FROM ${tableName} WHERE id = ?`, [report.content_id]);
    }

    // Mettre à jour le statut du signalement
    await pool.execute(
      `UPDATE reported_content 
       SET status = 'resolved', 
           moderator_id = ?, 
           moderator_action = ?, 
           moderator_notes = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [moderatorId, action, notes || null, reportId]
    );

    res.json({
      message: 'Signalement traité avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du traitement du signalement:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

module.exports = {
  reportContent,
  getReports,
  handleReport
};

