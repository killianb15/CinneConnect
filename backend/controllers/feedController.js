/**
 * Contrôleur pour le fil d'actualité
 * Combine les reviews récentes et les activités des utilisateurs
 */

const { pool } = require('../config/database');
const movieService = require('../services/movieService');
const { getTopRatedMoviesFromTMDB, getLatestMoviesFromTMDB } = movieService;

/**
 * Récupère le fil d'actualité global (tous les utilisateurs)
 * Pour les utilisateurs non connectés
 * Inclut les films les mieux notés et les plus récents (DB + TMDB)
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

    // Récupérer les films les mieux notés depuis notre base (notes utilisateurs)
    const [topRatedFromDB] = await pool.execute(`
      SELECT 
        f.id,
        f.tmdb_id,
        f.titre,
        f.affiche_url,
        f.date_sortie,
        ROUND(COALESCE(AVG(r.note), 0), 1) as note_moyenne,
        COUNT(r.id) as nombre_votes
      FROM films f
      LEFT JOIN reviews r ON f.id = r.film_id AND r.note IS NOT NULL AND r.note >= 1 AND r.note <= 5
      GROUP BY f.id, f.tmdb_id, f.titre, f.affiche_url, f.date_sortie
      HAVING COUNT(r.id) >= 2
      ORDER BY note_moyenne DESC, nombre_votes DESC, f.date_sortie DESC
      LIMIT 5
    `);

    // Récupérer les films les mieux notés depuis TMDB
    let topRatedFromTMDB = [];
    try {
      topRatedFromTMDB = await getTopRatedMoviesFromTMDB(1);
    } catch (tmdbError) {
      console.error('Erreur lors de la récupération des films mieux notés TMDB:', tmdbError.message);
    }

    // Créer un Map des tmdbId déjà présents dans la DB
    const dbTmdbIds = new Set(topRatedFromDB.map(f => f.tmdb_id).filter(id => id !== null));

    // Combiner tous les résultats (DB + TMDB) et trier par note décroissante
    const allTopRated = [
      ...topRatedFromDB.map(film => ({
        id: film.id,
        tmdbId: film.tmdb_id,
        titre: film.titre,
        afficheUrl: film.affiche_url,
        dateSortie: film.date_sortie,
        noteMoyenne: parseFloat(film.note_moyenne) || 0,
        nombreVotes: parseInt(film.nombre_votes) || 0
      })),
      ...topRatedFromTMDB
        .filter(movie => !dbTmdbIds.has(movie.tmdbId))
        .map(movie => ({
          id: null,
          tmdbId: movie.tmdbId,
          titre: movie.titre,
          afficheUrl: movie.afficheUrl,
          dateSortie: movie.dateSortie,
          noteMoyenne: movie.noteMoyenne || 0,
          nombreVotes: movie.nombreVotes || 0
        }))
    ]
      .sort((a, b) => {
        // Trier par note décroissante, puis par nombre de votes décroissant
        if (b.noteMoyenne !== a.noteMoyenne) {
          return b.noteMoyenne - a.noteMoyenne;
        }
        return b.nombreVotes - a.nombreVotes;
      })
      .slice(0, 5);

    // Récupérer les films les plus récents depuis notre base
    const [recentFromDB] = await pool.execute(`
      SELECT 
        f.id,
        f.tmdb_id,
        f.titre,
        f.affiche_url,
        f.date_sortie,
        ROUND(COALESCE(AVG(r.note), 0), 1) as note_moyenne,
        COUNT(r.id) as nombre_votes
      FROM films f
      LEFT JOIN reviews r ON f.id = r.film_id AND r.note IS NOT NULL AND r.note >= 1 AND r.note <= 5
      WHERE f.date_sortie IS NOT NULL
      GROUP BY f.id, f.tmdb_id, f.titre, f.affiche_url, f.date_sortie
      ORDER BY f.date_sortie DESC
      LIMIT 5
    `);

    // Récupérer les films les plus récents depuis TMDB
    let recentFromTMDB = [];
    try {
      recentFromTMDB = await getLatestMoviesFromTMDB(1);
    } catch (tmdbError) {
      console.error('Erreur lors de la récupération des films récents TMDB:', tmdbError.message);
    }

    // Créer un Map des tmdbId déjà présents dans la DB
    const recentDbTmdbIds = new Set(recentFromDB.map(f => f.tmdb_id).filter(id => id !== null));

    // Combiner tous les résultats (DB + TMDB) et trier par date décroissante
    const allRecent = [
      ...recentFromDB.map(film => ({
        id: film.id,
        tmdbId: film.tmdb_id,
        titre: film.titre,
        afficheUrl: film.affiche_url,
        dateSortie: film.date_sortie,
        noteMoyenne: parseFloat(film.note_moyenne) || 0,
        nombreVotes: parseInt(film.nombre_votes) || 0
      })),
      ...recentFromTMDB
        .filter(movie => !recentDbTmdbIds.has(movie.tmdbId) && movie.dateSortie)
        .map(movie => ({
          id: null,
          tmdbId: movie.tmdbId,
          titre: movie.titre,
          afficheUrl: movie.afficheUrl,
          dateSortie: movie.dateSortie,
          noteMoyenne: movie.noteMoyenne || 0,
          nombreVotes: movie.nombreVotes || 0
        }))
    ]
      .filter(film => film.dateSortie) // Ne garder que les films avec une date
      .sort((a, b) => {
        // Trier par date décroissante (les plus récents en premier)
        const dateA = new Date(a.dateSortie);
        const dateB = new Date(b.dateSortie);
        return dateB - dateA;
      })
      .slice(0, 5);

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

    res.json({
      feed: feedItems,
      topRatedFilms: allTopRated,
      recentFilms: allRecent,
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
 * Inclut les films les mieux notés et les plus récents (DB + TMDB)
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

    // Récupérer les films les mieux notés depuis notre base (notes utilisateurs)
    const [topRatedFromDB] = await pool.execute(`
      SELECT 
        f.id,
        f.tmdb_id,
        f.titre,
        f.affiche_url,
        f.date_sortie,
        ROUND(COALESCE(AVG(r.note), 0), 1) as note_moyenne,
        COUNT(r.id) as nombre_votes
      FROM films f
      LEFT JOIN reviews r ON f.id = r.film_id AND r.note IS NOT NULL AND r.note >= 1 AND r.note <= 5
      GROUP BY f.id, f.tmdb_id, f.titre, f.affiche_url, f.date_sortie
      HAVING COUNT(r.id) >= 2
      ORDER BY note_moyenne DESC, nombre_votes DESC, f.date_sortie DESC
      LIMIT 5
    `);

    // Récupérer les films les mieux notés depuis TMDB
    let topRatedFromTMDB = [];
    try {
      topRatedFromTMDB = await getTopRatedMoviesFromTMDB(1);
    } catch (tmdbError) {
      console.error('Erreur lors de la récupération des films mieux notés TMDB:', tmdbError.message);
    }

    // Créer un Map des tmdbId déjà présents dans la DB
    const dbTmdbIds = new Set(topRatedFromDB.map(f => f.tmdb_id).filter(id => id !== null));

    // Combiner tous les résultats (DB + TMDB) et trier par note décroissante
    const allTopRated = [
      ...topRatedFromDB.map(film => ({
        id: film.id,
        tmdbId: film.tmdb_id,
        titre: film.titre,
        afficheUrl: film.affiche_url,
        dateSortie: film.date_sortie,
        noteMoyenne: parseFloat(film.note_moyenne) || 0,
        nombreVotes: parseInt(film.nombre_votes) || 0
      })),
      ...topRatedFromTMDB
        .filter(movie => !dbTmdbIds.has(movie.tmdbId))
        .map(movie => ({
          id: null,
          tmdbId: movie.tmdbId,
          titre: movie.titre,
          afficheUrl: movie.afficheUrl,
          dateSortie: movie.dateSortie,
          noteMoyenne: movie.noteMoyenne || 0,
          nombreVotes: movie.nombreVotes || 0
        }))
    ]
      .sort((a, b) => {
        // Trier par note décroissante, puis par nombre de votes décroissant
        if (b.noteMoyenne !== a.noteMoyenne) {
          return b.noteMoyenne - a.noteMoyenne;
        }
        return b.nombreVotes - a.nombreVotes;
      })
      .slice(0, 5);

    // Récupérer les films les plus récents depuis notre base
    const [recentFromDB] = await pool.execute(`
      SELECT 
        f.id,
        f.tmdb_id,
        f.titre,
        f.affiche_url,
        f.date_sortie,
        ROUND(COALESCE(AVG(r.note), 0), 1) as note_moyenne,
        COUNT(r.id) as nombre_votes
      FROM films f
      LEFT JOIN reviews r ON f.id = r.film_id AND r.note IS NOT NULL AND r.note >= 1 AND r.note <= 5
      WHERE f.date_sortie IS NOT NULL
      GROUP BY f.id, f.tmdb_id, f.titre, f.affiche_url, f.date_sortie
      ORDER BY f.date_sortie DESC
      LIMIT 5
    `);

    // Récupérer les films les plus récents depuis TMDB
    let recentFromTMDB = [];
    try {
      recentFromTMDB = await getLatestMoviesFromTMDB(1);
    } catch (tmdbError) {
      console.error('Erreur lors de la récupération des films récents TMDB:', tmdbError.message);
    }

    // Créer un Map des tmdbId déjà présents dans la DB
    const recentDbTmdbIds = new Set(recentFromDB.map(f => f.tmdb_id).filter(id => id !== null));

    // Combiner tous les résultats (DB + TMDB) et trier par date décroissante
    const allRecent = [
      ...recentFromDB.map(film => ({
        id: film.id,
        tmdbId: film.tmdb_id,
        titre: film.titre,
        afficheUrl: film.affiche_url,
        dateSortie: film.date_sortie,
        noteMoyenne: parseFloat(film.note_moyenne) || 0,
        nombreVotes: parseInt(film.nombre_votes) || 0
      })),
      ...recentFromTMDB
        .filter(movie => !recentDbTmdbIds.has(movie.tmdbId) && movie.dateSortie)
        .map(movie => ({
          id: null,
          tmdbId: movie.tmdbId,
          titre: movie.titre,
          afficheUrl: movie.afficheUrl,
          dateSortie: movie.dateSortie,
          noteMoyenne: movie.noteMoyenne || 0,
          nombreVotes: movie.nombreVotes || 0
        }))
    ]
      .filter(film => film.dateSortie) // Ne garder que les films avec une date
      .sort((a, b) => {
        // Trier par date décroissante (les plus récents en premier)
        const dateA = new Date(a.dateSortie);
        const dateB = new Date(b.dateSortie);
        return dateB - dateA;
      })
      .slice(0, 5);

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

    res.json({
      feed: feedItems,
      topRatedFilms: allTopRated,
      recentFilms: allRecent,
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
