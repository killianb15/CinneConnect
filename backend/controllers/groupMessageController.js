/**
 * Contrôleur pour la gestion des messages de groupe (discussion)
 */

const { pool } = require('../config/database');

/**
 * Récupère tous les messages d'un groupe
 * @route GET /api/groups/:groupId/messages
 */
const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Vérifier que l'utilisateur est membre du groupe
    const [membership] = await pool.execute(
      'SELECT role FROM groupe_membres WHERE groupe_id = ? AND user_id = ?',
      [groupId, userId]
    );

    // Vérifier si le groupe est public
    const [group] = await pool.execute(
      'SELECT is_public FROM groupes WHERE id = ?',
      [groupId]
    );

    if (group.length === 0) {
      return res.status(404).json({
        error: 'Groupe non trouvé'
      });
    }

    // Si le groupe est privé et que l'utilisateur n'est pas membre
    if (!group[0].is_public && membership.length === 0) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous devez être membre du groupe pour voir les messages'
      });
    }

    // Récupérer les messages avec les informations de l'utilisateur
    const [messages] = await pool.execute(`
      SELECT 
        gm.id,
        gm.groupe_id,
        gm.message,
        gm.created_at,
        u.id as user_id,
        u.pseudo,
        u.photo_url
      FROM groupe_messages gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.groupe_id = ?
      ORDER BY gm.created_at ASC
    `, [groupId]);

    res.json({
      messages: messages.map(msg => ({
        id: msg.id,
        groupeId: msg.groupe_id,
        message: msg.message,
        createdAt: msg.created_at,
        user: {
          id: msg.user_id,
          pseudo: msg.pseudo,
          photoUrl: msg.photo_url
        }
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des messages'
    });
  }
};

/**
 * Crée un nouveau message dans un groupe
 * @route POST /api/groups/:groupId/messages
 */
const createGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    // Validation
    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Le message ne peut pas être vide'
      });
    }

    // Vérifier que l'utilisateur est membre du groupe
    const [membership] = await pool.execute(
      'SELECT role FROM groupe_membres WHERE groupe_id = ? AND user_id = ?',
      [groupId, userId]
    );

    // Vérifier si le groupe existe et est public
    const [group] = await pool.execute(
      'SELECT is_public FROM groupes WHERE id = ?',
      [groupId]
    );

    if (group.length === 0) {
      return res.status(404).json({
        error: 'Groupe non trouvé'
      });
    }

    // Si le groupe est privé et que l'utilisateur n'est pas membre
    if (!group[0].is_public && membership.length === 0) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous devez être membre du groupe pour envoyer des messages'
      });
    }

    // Créer le message
    const [result] = await pool.execute(
      'INSERT INTO groupe_messages (groupe_id, user_id, message) VALUES (?, ?, ?)',
      [groupId, userId, message.trim()]
    );

    // Récupérer le message créé avec les informations de l'utilisateur
    const [newMessage] = await pool.execute(`
      SELECT 
        gm.id,
        gm.groupe_id,
        gm.message,
        gm.created_at,
        u.id as user_id,
        u.pseudo,
        u.photo_url
      FROM groupe_messages gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.id = ?
    `, [result.insertId]);

    const messageData = {
      id: newMessage[0].id,
      groupeId: newMessage[0].groupe_id,
      message: newMessage[0].message,
      createdAt: newMessage[0].created_at,
      user: {
        id: newMessage[0].user_id,
        pseudo: newMessage[0].pseudo,
        photoUrl: newMessage[0].photo_url
      }
    };

    // Émettre le nouveau message via WebSocket à tous les membres du groupe
    const io = req.app.get('io');
    if (io) {
      io.to(`group-${groupId}`).emit('new-message', messageData);
    }

    res.status(201).json({
      message: messageData
    });
  } catch (error) {
    console.error('Erreur lors de la création du message:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la création du message'
    });
  }
};

module.exports = {
  getGroupMessages,
  createGroupMessage
};

