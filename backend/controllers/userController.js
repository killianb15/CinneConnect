/**
 * Contrôleur pour la gestion des profils utilisateurs
 */

const { pool } = require('../config/database');

/**
 * Récupère le profil d'un utilisateur
 */
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user ? req.user.id : null;

    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({
        error: 'ID utilisateur invalide'
      });
    }

    // Récupérer le profil
    const [users] = await pool.execute(
      `SELECT id, email, pseudo, photo_url, bio, genres_preferences, role, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    const user = users[0];

    // Récupérer les statistiques
    let stats = { nombre_reviews: 0, nombre_groupes: 0 };
    try {
      const [statsResult] = await pool.execute(`
        SELECT 
          COUNT(DISTINCT r.id) as nombre_reviews,
          COUNT(DISTINCT gm.groupe_id) as nombre_groupes
        FROM users u
        LEFT JOIN reviews r ON u.id = r.user_id
        LEFT JOIN groupe_membres gm ON u.id = gm.user_id
        WHERE u.id = ?
        GROUP BY u.id
      `, [userId]);
      if (statsResult.length > 0) {
        stats = {
          nombre_reviews: parseInt(statsResult[0].nombre_reviews) || 0,
          nombre_groupes: parseInt(statsResult[0].nombre_groupes) || 0
        };
      }
    } catch (error) {
      console.warn('Erreur lors de la récupération des statistiques:', error.message);
    }

    // Récupérer les 5 films préférés
    let favoriteFilms = [];
    try {
      const [favoriteFilmsResult] = await pool.execute(`
        SELECT f.*, uff.position
        FROM user_favorite_films uff
        JOIN films f ON uff.film_id = f.id
        WHERE uff.user_id = ?
        ORDER BY uff.position ASC, uff.created_at ASC
        LIMIT 5
      `, [userId]);
      favoriteFilms = favoriteFilmsResult || [];
    } catch (error) {
      console.warn('Erreur lors de la récupération des films favoris:', error.message);
    }

    // Récupérer les 3 dernières reviews
    let recentReviews = [];
    try {
      const [recentReviewsResult] = await pool.execute(`
        SELECT r.*, f.titre, f.affiche_url, f.date_sortie
        FROM reviews r
        JOIN films f ON r.film_id = f.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
        LIMIT 3
      `, [userId]);
      recentReviews = recentReviewsResult || [];
    } catch (error) {
      console.warn('Erreur lors de la récupération des reviews récentes:', error.message);
    }

    // Vérifier si l'utilisateur connecté suit cet utilisateur (seulement si connecté)
    let isFollowing = false;
    let followersCount = 0;
    let followingCount = 0;
    
    try {
      // Compter les followers et following (toujours disponible)
      const [followersCountResult] = await pool.execute(
        'SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?',
        [userId]
      );
      const [followingCountResult] = await pool.execute(
        'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?',
        [userId]
      );
      
      followersCount = followersCountResult[0]?.count || 0;
      followingCount = followingCountResult[0]?.count || 0;

      // Vérifier si l'utilisateur connecté suit cet utilisateur (seulement si connecté)
      if (currentUserId) {
        const [followStatus] = await pool.execute(
          'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?',
          [currentUserId, userId]
        );
        isFollowing = followStatus.length > 0;
      }
    } catch (error) {
      console.warn('Erreur lors de la récupération du statut de suivi:', error.message);
    }

    // Parser les genres préférés
    let genresPreferences = [];
    if (user.genres_preferences) {
      try {
        genresPreferences = typeof user.genres_preferences === 'string' 
          ? JSON.parse(user.genres_preferences) 
          : user.genres_preferences;
      } catch (e) {
        genresPreferences = [];
      }
    }

    res.json({
      user: {
        id: user.id,
        pseudo: user.pseudo,
        photoUrl: user.photo_url,
        bio: user.bio,
        genresPreferences: genresPreferences,
        role: user.role,
        createdAt: user.created_at,
        // Ne pas exposer l'email sauf si c'est le profil de l'utilisateur connecté
        email: parseInt(userId) === currentUserId ? user.email : undefined
      },
      stats: stats,
      favoriteFilms: (favoriteFilms || []).map(f => ({
        id: f.id,
        tmdbId: f.tmdb_id,
        titre: f.titre || '',
        titreOriginal: f.titre_original || '',
        afficheUrl: f.affiche_url || '',
        dateSortie: f.date_sortie,
        noteMoyenne: parseFloat(f.note_moyenne) || 0,
        position: f.position || 0
      })),
      recentReviews: (recentReviews || []).map(r => ({
        id: r.id,
        note: r.note,
        commentaire: r.commentaire || '',
        createdAt: r.created_at,
        film: {
          id: r.film_id,
          titre: r.titre || '',
          afficheUrl: r.affiche_url || '',
          dateSortie: r.date_sortie
        }
      })),
      isFollowing: isFollowing,
      followersCount: followersCount || 0,
      followingCount: followingCount || 0
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Met à jour le profil de l'utilisateur connecté
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pseudo, bio, photoUrl, genresPreferences } = req.body;

    const updates = [];
    const values = [];

    if (pseudo !== undefined) {
      updates.push('pseudo = ?');
      values.push(pseudo);
    }

    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio);
    }

    if (photoUrl !== undefined) {
      updates.push('photo_url = ?');
      values.push(photoUrl);
    }

    if (genresPreferences !== undefined) {
      updates.push('genres_preferences = ?');
      values.push(JSON.stringify(genresPreferences));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Aucune donnée à mettre à jour'
      });
    }

    values.push(userId);

    await pool.execute(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    // Récupérer le profil mis à jour
    const [users] = await pool.execute(
      'SELECT id, pseudo, photo_url, bio, genres_preferences FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0];
    let genresPrefs = [];
    if (user.genres_preferences) {
      try {
        genresPrefs = typeof user.genres_preferences === 'string' 
          ? JSON.parse(user.genres_preferences) 
          : user.genres_preferences;
      } catch (e) {
        genresPrefs = [];
      }
    }

    res.json({
      message: 'Profil mis à jour avec succès',
      user: {
        id: user.id,
        pseudo: user.pseudo,
        photoUrl: user.photo_url,
        bio: user.bio,
        genresPreferences: genresPrefs
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Récupère les groupes d'un utilisateur
 */
const getUserGroups = async (req, res) => {
  try {
    const { userId } = req.params;

    const [groupes] = await pool.execute(`
      SELECT 
        g.id,
        g.titre,
        g.description,
        g.image_couverture,
        g.thematique,
        g.is_public,
        g.created_at,
        gm.role as user_role,
        COUNT(DISTINCT gm2.user_id) as nombre_membres
      FROM groupes g
      JOIN groupe_membres gm ON g.id = gm.groupe_id
      LEFT JOIN groupe_membres gm2 ON g.id = gm2.groupe_id
      WHERE gm.user_id = ?
      GROUP BY g.id, g.titre, g.description, g.image_couverture, g.thematique, g.is_public, g.created_at, gm.role
      ORDER BY g.created_at DESC
    `, [userId]);

    res.json({
      groupes: groupes.map(g => ({
        id: g.id,
        titre: g.titre,
        description: g.description,
        imageCouverture: g.image_couverture,
        thematique: g.thematique,
        isPublic: g.is_public,
        createdAt: g.created_at,
        userRole: g.user_role,
        nombreMembres: g.nombre_membres
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
 * Ajoute un film aux favoris de l'utilisateur connecté
 */
const addFavoriteFilm = async (req, res) => {
  try {
    const userId = req.user.id;
    const { filmId } = req.params;

    // Vérifier que le film existe
    const [films] = await pool.execute('SELECT id FROM films WHERE id = ?', [filmId]);
    if (films.length === 0) {
      return res.status(404).json({
        error: 'Film non trouvé'
      });
    }

    // Vérifier si déjà en favoris
    const [existing] = await pool.execute(
      'SELECT id FROM user_favorite_films WHERE user_id = ? AND film_id = ?',
      [userId, filmId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: 'Film déjà en favoris'
      });
    }

    // Compter le nombre de favoris actuels pour déterminer la position
    const [count] = await pool.execute(
      'SELECT COUNT(*) as total FROM user_favorite_films WHERE user_id = ?',
      [userId]
    );
    const position = count[0].total;

    // Limiter à 5 films favoris
    if (position >= 5) {
      return res.status(400).json({
        error: 'Limite atteinte',
        message: 'Vous ne pouvez avoir que 5 films préférés maximum'
      });
    }

    await pool.execute(
      'INSERT INTO user_favorite_films (user_id, film_id, position) VALUES (?, ?, ?)',
      [userId, filmId, position]
    );

    res.json({
      message: 'Film ajouté aux favoris'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du film favori:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Supprime un film des favoris de l'utilisateur connecté
 */
const removeFavoriteFilm = async (req, res) => {
  try {
    const userId = req.user.id;
    const { filmId } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM user_favorite_films WHERE user_id = ? AND film_id = ?',
      [userId, filmId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Film non trouvé dans les favoris'
      });
    }

    // Réorganiser les positions
    const [remaining] = await pool.execute(
      'SELECT id FROM user_favorite_films WHERE user_id = ? ORDER BY position ASC',
      [userId]
    );

    for (let i = 0; i < remaining.length; i++) {
      await pool.execute(
        'UPDATE user_favorite_films SET position = ? WHERE id = ?',
        [i, remaining[i].id]
      );
    }

    res.json({
      message: 'Film retiré des favoris'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du film favori:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Suit un utilisateur
 */
const followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Ne pas pouvoir se suivre soi-même
    if (parseInt(userId) === currentUserId) {
      return res.status(400).json({
        error: 'Vous ne pouvez pas vous suivre vous-même'
      });
    }

    // Vérifier que l'utilisateur existe
    const [users] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si déjà suivi
    const [existing] = await pool.execute(
      'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?',
      [currentUserId, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: 'Vous suivez déjà cet utilisateur'
      });
    }

    // Créer la relation de suivi
    await pool.execute(
      'INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)',
      [currentUserId, userId]
    );

    res.json({
      message: 'Utilisateur suivi avec succès',
      isFollowing: true
    });
  } catch (error) {
    console.error('Erreur lors du suivi de l\'utilisateur:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors du suivi de l\'utilisateur'
    });
  }
};

/**
 * Ne suit plus un utilisateur
 */
const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Vérifier si la relation existe
    const [existing] = await pool.execute(
      'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?',
      [currentUserId, userId]
    );

    if (existing.length === 0) {
      return res.status(400).json({
        error: 'Vous ne suivez pas cet utilisateur'
      });
    }

    // Supprimer la relation
    await pool.execute(
      'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?',
      [currentUserId, userId]
    );

    res.json({
      message: 'Vous ne suivez plus cet utilisateur',
      isFollowing: false
    });
  } catch (error) {
    console.error('Erreur lors de l\'arrêt du suivi:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de l\'arrêt du suivi'
    });
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  getUserGroups,
  addFavoriteFilm,
  removeFavoriteFilm,
  followUser,
  unfollowUser
};

