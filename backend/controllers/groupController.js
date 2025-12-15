/**
 * Contrôleur pour la gestion des groupes thématiques
 */

const { pool } = require('../config/database');

/**
 * Récupère tous les groupes (publics ou ceux de l'utilisateur)
 */
const getGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer les groupes avec leurs statistiques
    const [groupes] = await pool.execute(`
      SELECT 
        g.id,
        g.createur_id,
        g.titre,
        g.description,
        g.image_couverture,
        g.thematique,
        g.is_public,
        g.created_at,
        g.updated_at,
        u.pseudo as createur_pseudo,
        COUNT(DISTINCT gm2.user_id) as nombre_membres,
        COUNT(DISTINCT gf.film_id) as nombre_films,
        (SELECT gm.role FROM groupe_membres gm WHERE gm.groupe_id = g.id AND gm.user_id = ? LIMIT 1) as user_role
      FROM groupes g
      JOIN users u ON g.createur_id = u.id
      LEFT JOIN groupe_membres gm2 ON g.id = gm2.groupe_id
      LEFT JOIN groupe_films gf ON g.id = gf.groupe_id
      WHERE g.is_public = TRUE OR EXISTS (
        SELECT 1 FROM groupe_membres gm3 
        WHERE gm3.groupe_id = g.id AND gm3.user_id = ?
      )
      GROUP BY g.id, g.createur_id, g.titre, g.description, g.image_couverture, g.thematique, g.is_public, g.created_at, g.updated_at, u.pseudo
      ORDER BY g.created_at DESC
    `, [userId, userId]);

    res.json({
      groupes: groupes.map(g => ({
        id: g.id,
        titre: g.titre,
        description: g.description,
        imageCouverture: g.image_couverture,
        thematique: g.thematique,
        isPublic: g.is_public,
        createdAt: g.created_at,
        createur: {
          pseudo: g.createur_pseudo
        },
        nombreMembres: g.nombre_membres,
        nombreFilms: g.nombre_films,
        userRole: g.user_role
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des groupes:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Récupère les détails d'un groupe
 */
const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Récupérer les détails du groupe
    const [groupes] = await pool.execute(`
      SELECT 
        g.*,
        u.pseudo as createur_pseudo,
        u.id as createur_id,
        gm.role as user_role
      FROM groupes g
      JOIN users u ON g.createur_id = u.id
      LEFT JOIN groupe_membres gm ON g.id = gm.groupe_id AND gm.user_id = ?
      WHERE g.id = ?
    `, [userId, groupId]);

    if (groupes.length === 0) {
      return res.status(404).json({
        error: 'Groupe non trouvé'
      });
    }

    const groupe = groupes[0];

    // Vérifier l'accès (public ou membre)
    if (!groupe.is_public && !groupe.user_role) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Ce groupe est privé'
      });
    }

    // Récupérer les membres
    const [membres] = await pool.execute(`
      SELECT 
        u.id,
        u.pseudo,
        u.photo_url,
        gm.role,
        gm.created_at as date_adhesion
      FROM groupe_membres gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.groupe_id = ?
      ORDER BY 
        CASE gm.role
          WHEN 'admin' THEN 1
          WHEN 'moderateur' THEN 2
          ELSE 3
        END,
        gm.created_at ASC
    `, [groupId]);

    // Récupérer les films du groupe
    const [films] = await pool.execute(`
      SELECT 
        f.*,
        u.pseudo as ajoute_par_pseudo
      FROM groupe_films gf
      JOIN films f ON gf.film_id = f.id
      JOIN users u ON gf.ajoute_par = u.id
      WHERE gf.groupe_id = ?
      ORDER BY gf.created_at DESC
    `, [groupId]);

    res.json({
      groupe: {
        id: groupe.id,
        titre: groupe.titre,
        description: groupe.description,
        imageCouverture: groupe.image_couverture,
        thematique: groupe.thematique,
        isPublic: groupe.is_public,
        createdAt: groupe.created_at,
        createur: {
          id: groupe.createur_id,
          pseudo: groupe.createur_pseudo
        },
        userRole: groupe.user_role
      },
      membres: membres.map(m => ({
        id: m.id,
        pseudo: m.pseudo,
        photoUrl: m.photo_url,
        role: m.role,
        dateAdhesion: m.date_adhesion
      })),
      films: films.map(f => ({
        id: f.id,
        titre: f.titre,
        afficheUrl: f.affiche_url,
        dateSortie: f.date_sortie,
        ajoutePar: f.ajoute_par_pseudo
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du groupe:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Crée un nouveau groupe
 */
const createGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { titre, description, imageCouverture, thematique, isPublic } = req.body;

    if (!titre) {
      return res.status(400).json({
        error: 'Le titre est requis'
      });
    }

    // Créer le groupe
    const [result] = await pool.execute(
      `INSERT INTO groupes (createur_id, titre, description, image_couverture, thematique, is_public)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, titre, description || null, imageCouverture || null, thematique || null, isPublic !== false]
    );

    const groupId = result.insertId;

    // Ajouter le créateur comme admin
    await pool.execute(
      'INSERT INTO groupe_membres (groupe_id, user_id, role) VALUES (?, ?, ?)',
      [groupId, userId, 'admin']
    );

    // Récupérer le groupe créé
    const [groupes] = await pool.execute(
      'SELECT * FROM groupes WHERE id = ?',
      [groupId]
    );

    res.status(201).json({
      message: 'Groupe créé avec succès',
      groupe: {
        id: groupes[0].id,
        titre: groupes[0].titre,
        description: groupes[0].description,
        imageCouverture: groupes[0].image_couverture,
        thematique: groupes[0].thematique,
        isPublic: groupes[0].is_public,
        createdAt: groupes[0].created_at
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création du groupe:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Met à jour un groupe
 */
const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const { titre, description, imageCouverture, thematique, isPublic } = req.body;

    // Vérifier que l'utilisateur est admin ou modérateur
    const [membres] = await pool.execute(
      'SELECT role FROM groupe_membres WHERE groupe_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (membres.length === 0 || !['admin', 'moderateur'].includes(membres[0].role)) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous devez être admin ou modérateur pour modifier ce groupe'
      });
    }

    const updates = [];
    const values = [];

    if (titre !== undefined) {
      updates.push('titre = ?');
      values.push(titre);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (imageCouverture !== undefined) {
      updates.push('image_couverture = ?');
      values.push(imageCouverture);
    }
    if (thematique !== undefined) {
      updates.push('thematique = ?');
      values.push(thematique);
    }
    if (isPublic !== undefined) {
      updates.push('is_public = ?');
      values.push(isPublic);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Aucune donnée à mettre à jour'
      });
    }

    values.push(groupId);

    await pool.execute(
      `UPDATE groupes SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.json({
      message: 'Groupe mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du groupe:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Supprime un groupe
 */
const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Vérifier que l'utilisateur est admin
    const [membres] = await pool.execute(
      'SELECT role FROM groupe_membres WHERE groupe_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (membres.length === 0 || membres[0].role !== 'admin') {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous devez être admin pour supprimer ce groupe'
      });
    }

    await pool.execute('DELETE FROM groupes WHERE id = ?', [groupId]);

    res.json({
      message: 'Groupe supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du groupe:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Rejoint un groupe
 */
const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Vérifier que le groupe existe et est public
    const [groupes] = await pool.execute(
      'SELECT is_public FROM groupes WHERE id = ?',
      [groupId]
    );

    if (groupes.length === 0) {
      return res.status(404).json({
        error: 'Groupe non trouvé'
      });
    }

    if (!groupes[0].is_public) {
      return res.status(403).json({
        error: 'Groupe privé',
        message: 'Ce groupe est privé. Vous devez être invité pour le rejoindre.'
      });
    }

    // Vérifier si déjà membre
    const [existing] = await pool.execute(
      'SELECT id FROM groupe_membres WHERE groupe_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Déjà membre',
        message: 'Vous êtes déjà membre de ce groupe'
      });
    }

    // Ajouter comme membre
    await pool.execute(
      'INSERT INTO groupe_membres (groupe_id, user_id, role) VALUES (?, ?, ?)',
      [groupId, userId, 'membre']
    );

    res.json({
      message: 'Vous avez rejoint le groupe avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'adhésion au groupe:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Quitte un groupe
 */
const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Vérifier si membre
    const [membres] = await pool.execute(
      'SELECT role FROM groupe_membres WHERE groupe_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (membres.length === 0) {
      return res.status(404).json({
        error: 'Vous n\'êtes pas membre de ce groupe'
      });
    }

    // Ne pas permettre au créateur/admin de quitter
    if (membres[0].role === 'admin') {
      return res.status(403).json({
        error: 'Action interdite',
        message: 'L\'admin ne peut pas quitter le groupe. Transférez d\'abord les droits ou supprimez le groupe.'
      });
    }

    await pool.execute(
      'DELETE FROM groupe_membres WHERE groupe_id = ? AND user_id = ?',
      [groupId, userId]
    );

    res.json({
      message: 'Vous avez quitté le groupe'
    });
  } catch (error) {
    console.error('Erreur lors de la sortie du groupe:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Invite un utilisateur à rejoindre un groupe
 */
const inviteToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const { inviteUserId } = req.body;

    if (!inviteUserId) {
      return res.status(400).json({
        error: 'L\'utilisateur à inviter est requis'
      });
    }

    // Vérifier que l'utilisateur est membre avec droits
    const [membres] = await pool.execute(
      'SELECT role FROM groupe_membres WHERE groupe_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (membres.length === 0) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous devez être membre du groupe pour inviter des membres'
      });
    }

    // Vérifier que l'utilisateur invité existe
    const [invites] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [inviteUserId]
    );

    if (invites.length === 0) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    const inviteId = invites[0].id;

    // Vérifier que c'est un ami pour ce flux
    const [friends] = await pool.execute(
      `SELECT id FROM friends 
       WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`,
      [userId, inviteId, inviteId, userId]
    );

    if (friends.length === 0) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous pouvez uniquement inviter vos amis'
      });
    }

    // Vérifier si déjà membre
    const [existing] = await pool.execute(
      'SELECT id FROM groupe_membres WHERE groupe_id = ? AND user_id = ?',
      [groupId, inviteId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Déjà membre',
        message: 'Cet utilisateur est déjà membre du groupe'
      });
    }

    // Vérifier si une invitation existe déjà pour ce groupe et cet utilisateur
    const [existingInvitation] = await pool.execute(
      'SELECT id, statut FROM groupe_invitations WHERE groupe_id = ? AND invite_id = ?',
      [groupId, inviteId]
    );

    // Récupérer les informations du groupe et de l'inviteur pour la notification
    const [groupeInfo] = await pool.execute(
      'SELECT titre FROM groupes WHERE id = ?',
      [groupId]
    );

    const [inviteurInfo] = await pool.execute(
      'SELECT pseudo FROM users WHERE id = ?',
      [userId]
    );

    const groupeTitre = groupeInfo.length > 0 ? groupeInfo[0].titre : 'un groupe';
    const inviteurPseudo = inviteurInfo.length > 0 ? inviteurInfo[0].pseudo : 'quelqu\'un';

    if (existingInvitation.length > 0) {
      const existingInv = existingInvitation[0];
      if (existingInv.statut === 'en_attente') {
        return res.status(409).json({
          error: 'Déjà invité',
          message: 'Cet utilisateur a déjà une invitation en attente pour ce groupe'
        });
      } else {
        // Si l'invitation a été acceptée/refusée, mettre à jour pour créer une nouvelle invitation en_attente
        await pool.execute(
          'UPDATE groupe_invitations SET statut = ?, inviteur_id = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['en_attente', userId, existingInv.id]
        );
      }
    } else {
      // Créer une nouvelle invitation
      await pool.execute(
        'INSERT INTO groupe_invitations (groupe_id, inviteur_id, invite_id, statut) VALUES (?, ?, ?, ?)',
        [groupId, userId, inviteId, 'en_attente']
      );
    }

    // Ne pas créer de notification dans la table notifications car l'invitation est déjà gérée
    // via la table groupe_invitations qui est affichée dans la section dédiée
    
    // Émettre un événement WebSocket pour notifier l'utilisateur invité
    const io = req.app.get('io');
    if (io) {
      console.log(`📤 Émission WebSocket vers user-${inviteId} pour notification d'invitation`);
      io.to(`user-${inviteId}`).emit('new-notification', {
        type: 'group-invitation',
        groupId: groupId,
        groupTitle: groupeTitre,
        inviterPseudo: inviteurPseudo
      });
    } else {
      console.warn('⚠️ WebSocket io non disponible pour l\'émission de notification');
    }

    res.json({
      message: 'Invitation envoyée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'invitation:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Ajoute un film à un groupe
 */
const addFilmToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const { filmId } = req.body;

    if (!filmId) {
      return res.status(400).json({
        error: 'L\'ID du film est requis'
      });
    }

    // Vérifier que l'utilisateur est membre
    const [membres] = await pool.execute(
      'SELECT role FROM groupe_membres WHERE groupe_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (membres.length === 0) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous devez être membre du groupe pour ajouter un film'
      });
    }

    // Vérifier que le film existe
    const [films] = await pool.execute('SELECT id FROM films WHERE id = ?', [filmId]);
    if (films.length === 0) {
      return res.status(404).json({
        error: 'Film non trouvé'
      });
    }

    // Vérifier si déjà dans le groupe
    const [existing] = await pool.execute(
      'SELECT id FROM groupe_films WHERE groupe_id = ? AND film_id = ?',
      [groupId, filmId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Film déjà ajouté',
        message: 'Ce film est déjà dans le groupe'
      });
    }

    // Ajouter le film
    await pool.execute(
      'INSERT INTO groupe_films (groupe_id, film_id, ajoute_par) VALUES (?, ?, ?)',
      [groupId, filmId, userId]
    );

    res.json({
      message: 'Film ajouté au groupe avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du film:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Récupère les invitations aux groupes pour l'utilisateur connecté
 */
const getGroupInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    const [invitations] = await pool.execute(
      `SELECT gi.id, gi.groupe_id, gi.inviteur_id, gi.statut, gi.created_at,
              g.titre AS groupe_titre,
              u.pseudo AS inviteur_pseudo
       FROM groupe_invitations gi
       JOIN groupes g ON g.id = gi.groupe_id
       JOIN users u ON u.id = gi.inviteur_id
       WHERE gi.invite_id = ? AND gi.statut = 'en_attente'
       ORDER BY gi.created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({
      invitations: invitations.map(inv => ({
        id: inv.id,
        groupId: inv.groupe_id,
        groupTitle: inv.groupe_titre,
        inviterId: inv.inviteur_id,
        inviterPseudo: inv.inviteur_pseudo,
        status: inv.statut,
        createdAt: inv.created_at
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des invitations de groupe:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Accepte une invitation de groupe
 */
const acceptGroupInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user.id;

    // Vérifier l'invitation
    const [invits] = await pool.execute(
      `SELECT id, groupe_id, statut FROM groupe_invitations 
       WHERE id = ? AND invite_id = ?`,
      [invitationId, userId]
    );

    if (invits.length === 0) {
      return res.status(404).json({ error: 'Invitation non trouvée' });
    }

    const invitation = invits[0];
    if (invitation.statut !== 'en_attente') {
      return res.status(400).json({ error: 'Invitation déjà traitée' });
    }

    // Vérifier si déjà membre
    const [existing] = await pool.execute(
      'SELECT id FROM groupe_membres WHERE groupe_id = ? AND user_id = ?',
      [invitation.groupe_id, userId]
    );

    if (existing.length === 0) {
      await pool.execute(
        'INSERT INTO groupe_membres (groupe_id, user_id, role) VALUES (?, ?, ?)',
        [invitation.groupe_id, userId, 'membre']
      );
    }

    // Mettre à jour l'invitation
    await pool.execute(
      `UPDATE groupe_invitations 
       SET statut = 'acceptee' 
       WHERE id = ?`,
      [invitationId]
    );

    res.json({ message: 'Invitation acceptée' });
  } catch (error) {
    console.error('Erreur lors de l\'acceptation de l\'invitation:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Refuse une invitation de groupe
 */
const rejectGroupInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user.id;

    const [invits] = await pool.execute(
      `SELECT id, statut FROM groupe_invitations 
       WHERE id = ? AND invite_id = ?`,
      [invitationId, userId]
    );

    if (invits.length === 0) {
      return res.status(404).json({ error: 'Invitation non trouvée' });
    }

    const invitation = invits[0];
    if (invitation.statut !== 'en_attente') {
      return res.status(400).json({ error: 'Invitation déjà traitée' });
    }

    await pool.execute(
      `UPDATE groupe_invitations 
       SET statut = 'refusee' 
       WHERE id = ?`,
      [invitationId]
    );

    res.json({ message: 'Invitation refusée' });
  } catch (error) {
    console.error('Erreur lors du refus de l\'invitation:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

module.exports = {
  getGroups,
  getGroupDetails,
  createGroup,
  updateGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  inviteToGroup,
  addFilmToGroup,
  getGroupInvitations,
  acceptGroupInvitation,
  rejectGroupInvitation
};

