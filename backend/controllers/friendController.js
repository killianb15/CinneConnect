/**
 * Contrôleur pour la gestion des demandes d'amis et des relations d'amitié
 */

const { pool } = require('../config/database');

/**
 * Parcourt les profils disponibles (sauf soi-même et ses amis)
 * @route GET /api/users/discover
 */
const discoverProfiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const searchQuery = req.query.search || ''; // Paramètre de recherche

    // Construire la condition de recherche
    let searchCondition = '';
    let searchParams = [];
    if (searchQuery.trim()) {
      searchCondition = 'AND u.pseudo LIKE ?';
      searchParams = [`%${searchQuery.trim()}%`];
    }

    // Récupérer d'abord les IDs des amis
    const [friendsRows] = await pool.execute(`
      SELECT 
        CASE 
          WHEN user1_id = ? THEN user2_id 
          ELSE user1_id 
        END as friend_id
      FROM friends
      WHERE user1_id = ? OR user2_id = ?
    `, [userId, userId, userId]);
    
    // Récupérer les demandes envoyées (pour les exclure)
    const [sentRequestsRows] = await pool.execute(`
      SELECT receiver_id 
      FROM friend_requests 
      WHERE requester_id = ? AND status = 'pending'
    `, [userId]);
    
    // Construire la condition WHERE avec NOT EXISTS pour éviter les problèmes de placeholders
    let whereConditions = ['u.id != ?'];
    let queryParams = [userId];
    
    // Exclure les amis avec NOT EXISTS
    if (friendsRows.length > 0) {
      whereConditions.push(`NOT EXISTS (
        SELECT 1 FROM friends f
        WHERE (f.user1_id = ? AND f.user2_id = u.id)
           OR (f.user1_id = u.id AND f.user2_id = ?)
      )`);
      queryParams.push(userId, userId);
    }
    
    // Exclure uniquement les demandes ENVOYÉES (pas les reçues, pour qu'on puisse les accepter/refuser)
    if (sentRequestsRows.length > 0) {
      whereConditions.push(`NOT EXISTS (
        SELECT 1 FROM friend_requests fr
        WHERE fr.requester_id = ? AND fr.receiver_id = u.id AND fr.status = 'pending'
      )`);
      queryParams.push(userId);
    }
    
    // Ajouter la condition de recherche si présente
    if (searchCondition) {
      whereConditions.push(searchCondition);
      queryParams.push(...searchParams);
    }
    
    // Récupérer les profils
    // Utiliser des valeurs directes pour LIMIT et OFFSET car MySQL2 peut avoir des problèmes avec les placeholders
    const limitValue = parseInt(limit) || 20;
    const offsetValue = parseInt(offset) || 0;
    
    const [profiles] = await pool.execute(`
      SELECT DISTINCT
        u.id,
        u.pseudo,
        u.photo_url,
        u.bio,
        u.created_at,
        COUNT(DISTINCT r.id) as nombre_reviews,
        COUNT(DISTINCT gm.groupe_id) as nombre_groupes,
        COUNT(DISTINCT fr1.id) as nombre_followers,
        COUNT(DISTINCT fr2.id) as nombre_following
      FROM users u
      LEFT JOIN reviews r ON r.user_id = u.id
      LEFT JOIN groupe_membres gm ON gm.user_id = u.id
      LEFT JOIN user_follows fr1 ON fr1.following_id = u.id
      LEFT JOIN user_follows fr2 ON fr2.follower_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY u.id, u.pseudo, u.photo_url, u.bio, u.created_at
      ORDER BY u.created_at DESC
      LIMIT ${limitValue} OFFSET ${offsetValue}
    `, queryParams);

    // Récupérer le statut des demandes d'amis pour chaque profil
    const profilesWithStatus = await Promise.all(profiles.map(async (profile) => {
      // Vérifier s'il y a une demande d'ami reçue (pour accepter/refuser)
      const [receivedRequest] = await pool.execute(`
        SELECT id, status, requester_id, receiver_id, created_at
        FROM friend_requests
        WHERE requester_id = ? AND receiver_id = ? AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
      `, [profile.id, userId]);

      let friendStatus = 'none'; // none ou can_accept (pour accepter/refuser)
      let requestId = null;
      
      // Si une demande a été reçue, on indique qu'on peut accepter/refuser
      if (receivedRequest.length > 0) {
        friendStatus = 'can_accept'; // Statut clair pour le frontend
        requestId = receivedRequest[0].id; // ID de la demande pour accepter/refuser
      }

      return {
        id: profile.id,
        pseudo: profile.pseudo,
        photoUrl: profile.photo_url,
        bio: profile.bio,
        createdAt: profile.created_at,
        stats: {
          nombreReviews: parseInt(profile.nombre_reviews) || 0,
          nombreGroupes: parseInt(profile.nombre_groupes) || 0,
          nombreFollowers: parseInt(profile.nombre_followers) || 0,
          nombreFollowing: parseInt(profile.nombre_following) || 0
        },
        friendStatus: friendStatus,
        // Si une demande a été reçue, inclure l'ID pour accepter/refuser
        ...(requestId && { 
          receivedRequestId: requestId,
          canAccept: true,
          canReject: true
        })
      };
    }));

    res.json({
      profiles: profilesWithStatus,
      total: profilesWithStatus.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Erreur lors de la découverte de profils:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des profils'
    });
  }
};

/**
 * Envoie une demande d'ami
 * @route POST /api/users/:userId/friend-request
 */
const sendFriendRequest = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { userId } = req.params;

    if (parseInt(userId) === requesterId) {
      return res.status(400).json({
        error: 'Vous ne pouvez pas vous envoyer une demande d\'ami à vous-même'
      });
    }

    // Vérifier que l'utilisateur existe
    const [users] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si déjà amis
    const [friendship] = await pool.execute(`
      SELECT id FROM friends
      WHERE (user1_id = ? AND user2_id = ?)
         OR (user1_id = ? AND user2_id = ?)
    `, [requesterId, userId, userId, requesterId]);

    if (friendship.length > 0) {
      return res.status(400).json({
        error: 'Vous êtes déjà amis avec cet utilisateur'
      });
    }

    // Vérifier s'il y a déjà une demande
    const [existingRequest] = await pool.execute(`
      SELECT id, status, requester_id FROM friend_requests
      WHERE (requester_id = ? AND receiver_id = ?)
         OR (requester_id = ? AND receiver_id = ?)
      ORDER BY created_at DESC
      LIMIT 1
    `, [requesterId, userId, userId, requesterId]);

    if (existingRequest.length > 0) {
      const request = existingRequest[0];
      if (request.status === 'pending') {
        if (request.requester_id === requesterId) {
          return res.status(400).json({
            error: 'Vous avez déjà envoyé une demande d\'ami à cet utilisateur'
          });
        } else {
          return res.status(400).json({
            error: 'Cet utilisateur vous a déjà envoyé une demande d\'ami'
          });
        }
      }
    }

    // Créer la demande d'ami
    await pool.execute(`
      INSERT INTO friend_requests (requester_id, receiver_id, status)
      VALUES (?, ?, 'pending')
    `, [requesterId, userId]);

    res.status(201).json({
      message: 'Demande d\'ami envoyée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la demande d\'ami:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de l\'envoi de la demande'
    });
  }
};

/**
 * Accepte une demande d'ami
 * @route POST /api/users/:userId/friend-request/accept
 */
const acceptFriendRequest = async (req, res) => {
  try {
    const receiverId = req.user.id;
    const { userId } = req.params; // L'ID de celui qui a envoyé la demande

    // Trouver la demande d'ami
    const [requests] = await pool.execute(`
      SELECT id, status FROM friend_requests
      WHERE requester_id = ? AND receiver_id = ? AND status = 'pending'
    `, [userId, receiverId]);

    if (requests.length === 0) {
      return res.status(404).json({
        error: 'Demande d\'ami non trouvée ou déjà traitée'
      });
    }

    // Mettre à jour le statut de la demande
    await pool.execute(`
      UPDATE friend_requests
      SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [requests[0].id]);

    // Créer la relation d'amitié (user1_id < user2_id pour éviter les doublons)
    const user1Id = Math.min(userId, receiverId);
    const user2Id = Math.max(userId, receiverId);

    await pool.execute(`
      INSERT INTO friends (user1_id, user2_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE id = id
    `, [user1Id, user2Id]);

    res.json({
      message: 'Demande d\'ami acceptée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'acceptation de la demande d\'ami:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de l\'acceptation de la demande'
    });
  }
};

/**
 * Refuse une demande d'ami
 * @route POST /api/users/:userId/friend-request/reject
 */
const rejectFriendRequest = async (req, res) => {
  try {
    const receiverId = req.user.id;
    const { userId } = req.params; // L'ID de celui qui a envoyé la demande

    // Trouver la demande d'ami
    const [requests] = await pool.execute(`
      SELECT id FROM friend_requests
      WHERE requester_id = ? AND receiver_id = ? AND status = 'pending'
    `, [userId, receiverId]);

    if (requests.length === 0) {
      return res.status(404).json({
        error: 'Demande d\'ami non trouvée ou déjà traitée'
      });
    }

    // Mettre à jour le statut de la demande
    await pool.execute(`
      UPDATE friend_requests
      SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [requests[0].id]);

    res.json({
      message: 'Demande d\'ami refusée'
    });
  } catch (error) {
    console.error('Erreur lors du refus de la demande d\'ami:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors du refus de la demande'
    });
  }
};

/**
 * Récupère les demandes d'amis reçues en attente
 * @route GET /api/users/friend-requests
 */
const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer les demandes reçues en attente
    const [requests] = await pool.execute(`
      SELECT 
        fr.id,
        fr.requester_id,
        fr.receiver_id,
        fr.status,
        fr.created_at,
        u.id as user_id,
        u.pseudo,
        u.photo_url,
        u.bio
      FROM friend_requests fr
      JOIN users u ON u.id = fr.requester_id
      WHERE fr.receiver_id = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `, [userId]);

    const formattedRequests = requests.map(req => ({
      id: req.id,
      requester: {
        id: req.user_id,
        pseudo: req.pseudo,
        photoUrl: req.photo_url,
        bio: req.bio
      },
      status: req.status,
      createdAt: req.created_at
    }));

    res.json({
      requests: formattedRequests,
      total: formattedRequests.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes d\'amis:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des demandes'
    });
  }
};

/**
 * Récupère la liste des amis
 * @route GET /api/users/friends
 */
const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer les amis
    const [friends] = await pool.execute(`
      SELECT 
        CASE 
          WHEN f.user1_id = ? THEN f.user2_id 
          ELSE f.user1_id 
        END as friend_id,
        u.id,
        u.pseudo,
        u.photo_url,
        u.bio,
        f.created_at as friendship_date
      FROM friends f
      JOIN users u ON u.id = CASE 
        WHEN f.user1_id = ? THEN f.user2_id 
        ELSE f.user1_id 
      END
      WHERE f.user1_id = ? OR f.user2_id = ?
      ORDER BY f.created_at DESC
    `, [userId, userId, userId, userId]);

    const formattedFriends = friends.map(friend => ({
      id: friend.id,
      pseudo: friend.pseudo,
      photoUrl: friend.photo_url,
      bio: friend.bio,
      friendshipDate: friend.friendship_date
    }));

    res.json({
      friends: formattedFriends,
      total: formattedFriends.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des amis:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des amis'
    });
  }
};

module.exports = {
  discoverProfiles,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriends
};

