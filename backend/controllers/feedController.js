/**
 * Contrôleur pour le fil d'actualité
 * Combine les reviews récentes et les activités des utilisateurs
 */

const { pool } = require('../config/database');

/**
 * Récupère le fil d'actualité global (tous les utilisateurs)
 * Pour les utilisateurs non connectés
 * Inclut les films les mieux notés et les plus récents
 */
const getGlobalFeed = async (req, res) => {
  try {
    // Récupérer les reviews récentes de tous les utilisateurs
    const [reviews] = await pool.execute(`
      SELECT 
        r.id,
        r.note,
        r.commentaire,
        r.created_at,
        u.id as user_id,
        u.pseudo,
        u.photo_url as user_photo,
        u.bio as user_bio,
        f.id as film_id,
        f.titre as film_titre,
        f.affiche_url as film_affiche,
        f.date_sortie as film_date
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN films f ON r.film_id = f.id
      WHERE r.commentaire IS NOT NULL AND r.commentaire != ''
      ORDER BY r.created_at DESC
      LIMIT 50
    `);

    // Récupérer les films les mieux notés
    const [topRatedFilms] = await pool.execute(`
      SELECT 
        id,
        titre,
        affiche_url,
        date_sortie,
        note_moyenne,
        nombre_votes
      FROM films
      WHERE note_moyenne > 0 AND nombre_votes > 0
      ORDER BY note_moyenne DESC, nombre_votes DESC
      LIMIT 5
    `);

    // Récupérer les films les plus récents
    const [recentFilms] = await pool.execute(`
      SELECT 
        id,
        titre,
        affiche_url,
        date_sortie,
        note_moyenne,
        nombre_votes
      FROM films
      WHERE date_sortie IS NOT NULL
      ORDER BY date_sortie DESC
      LIMIT 5
    `);

    // Formater les données
    const feedItems = reviews.map(review => ({
      id: review.id,
      type: 'review',
      createdAt: review.created_at,
      user: {
        id: review.user_id,
        pseudo: review.pseudo,
        photoUrl: review.user_photo,
        bio: review.user_bio
      },
      review: {
        note: review.note,
        commentaire: review.commentaire
      },
      film: {
        id: review.film_id,
        titre: review.film_titre,
        afficheUrl: review.film_affiche,
        dateSortie: review.film_date
      }
    }));

    const topRated = topRatedFilms.map(film => ({
      id: film.id,
      titre: film.titre,
      afficheUrl: film.affiche_url,
      dateSortie: film.date_sortie,
      noteMoyenne: parseFloat(film.note_moyenne),
      nombreVotes: film.nombre_votes
    }));

    const recent = recentFilms.map(film => ({
      id: film.id,
      titre: film.titre,
      afficheUrl: film.affiche_url,
      dateSortie: film.date_sortie,
      noteMoyenne: parseFloat(film.note_moyenne),
      nombreVotes: film.nombre_votes
    }));

    res.json({
      feed: feedItems,
      topRatedFilms: topRated,
      recentFilms: recent,
      total: feedItems.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du fil d\'actualité global:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération du fil d\'actualité'
    });
  }
};

/**
 * Récupère le fil d'actualité pour l'utilisateur connecté
 * Affiche uniquement les reviews des amis (pas les propres reviews)
 * Inclut les films les mieux notés et les plus récents
 */
const getFeed = async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer uniquement les reviews des amis (exclure les propres reviews)
    const [reviews] = await pool.execute(`
      SELECT DISTINCT
        r.id,
        r.note,
        r.commentaire,
        r.created_at,
        u.id as user_id,
        u.pseudo,
        u.photo_url as user_photo,
        u.bio as user_bio,
        f.id as film_id,
        f.titre as film_titre,
        f.affiche_url as film_affiche,
        f.date_sortie as film_date
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN films f ON r.film_id = f.id
      WHERE r.user_id != ?
        AND r.commentaire IS NOT NULL AND r.commentaire != ''
        AND EXISTS (
          SELECT 1 FROM friends fr 
          WHERE (fr.user1_id = ? AND fr.user2_id = r.user_id)
             OR (fr.user1_id = r.user_id AND fr.user2_id = ?)
        )
      ORDER BY r.created_at DESC
      LIMIT 50
    `, [userId, userId, userId]);

    // Récupérer les films les mieux notés
    const [topRatedFilms] = await pool.execute(`
      SELECT 
        id,
        titre,
        affiche_url,
        date_sortie,
        note_moyenne,
        nombre_votes
      FROM films
      WHERE note_moyenne > 0 AND nombre_votes > 0
      ORDER BY note_moyenne DESC, nombre_votes DESC
      LIMIT 5
    `);

    // Récupérer les films les plus récents
    const [recentFilms] = await pool.execute(`
      SELECT 
        id,
        titre,
        affiche_url,
        date_sortie,
        note_moyenne,
        nombre_votes
      FROM films
      WHERE date_sortie IS NOT NULL
      ORDER BY date_sortie DESC
      LIMIT 5
    `);

    // Formater les données
    const feedItems = reviews.map(review => ({
      id: review.id,
      type: 'review',
      createdAt: review.created_at,
      user: {
        id: review.user_id,
        pseudo: review.pseudo,
        photoUrl: review.user_photo,
        bio: review.user_bio
      },
      review: {
        note: review.note,
        commentaire: review.commentaire
      },
      film: {
        id: review.film_id,
        titre: review.film_titre,
        afficheUrl: review.film_affiche,
        dateSortie: review.film_date
      }
    }));

    const topRated = topRatedFilms.map(film => ({
      id: film.id,
      titre: film.titre,
      afficheUrl: film.affiche_url,
      dateSortie: film.date_sortie,
      noteMoyenne: parseFloat(film.note_moyenne),
      nombreVotes: film.nombre_votes
    }));

    const recent = recentFilms.map(film => ({
      id: film.id,
      titre: film.titre,
      afficheUrl: film.affiche_url,
      dateSortie: film.date_sortie,
      noteMoyenne: parseFloat(film.note_moyenne),
      nombreVotes: film.nombre_votes
    }));

    res.json({
      feed: feedItems,
      topRatedFilms: topRated,
      recentFilms: recent,
      total: feedItems.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du fil d\'actualité:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération du fil d\'actualité'
    });
  }
};

module.exports = {
  getFeed,
  getGlobalFeed
};


