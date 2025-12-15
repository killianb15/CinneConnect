/**
 * Contrôleur pour les notifications
 */

const { pool } = require('../config/database');

/**
 * Récupère les notifications de l'utilisateur connecté
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const [notifications] = await pool.execute(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId]);

    res.json({
      notifications: notifications.map(notif => ({
        id: notif.id,
        type: notif.type,
        titre: notif.titre,
        message: notif.message,
        lien: notif.lien,
        isLu: notif.is_lu,
        createdAt: notif.created_at
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Marque une notification comme lue
 */
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    await pool.execute(
      'UPDATE notifications SET is_lu = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    res.json({
      message: 'Notification marquée comme lue'
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead
};


