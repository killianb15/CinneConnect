/**
 * Contrôleur pour la gestion des films
 */

const { pool } = require('../config/database');
const movieService = require('../services/movieService');
const { getMovieFromTMDB, searchMoviesOnTMDB } = movieService;

/**
 * Parse une valeur JSON de manière sécurisée
 * MySQL peut retourner les colonnes JSON déjà parsées ou comme chaînes
 * @param {any} value - La valeur à parser (peut être un objet, une chaîne ou null)
 * @param {any} defaultValue - La valeur par défaut si le parsing échoue (défaut: null)
 * @returns {any} L'objet parsé ou la valeur par défaut
 */
function parseJSON(value, defaultValue = null) {
  if (!value) return defaultValue;
  if (typeof value === 'object' && !Array.isArray(value)) {
    // Si c'est déjà un objet (mais pas un tableau), le retourner tel quel
    return value;
  }
  if (Array.isArray(value)) {
    // Si c'est déjà un tableau, le retourner tel quel
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed;
    } catch (e) {
      console.warn('Erreur de parsing JSON:', e.message, 'Valeur:', value);
      return defaultValue;
    }
  }
  return defaultValue;
}

/**
 * Crée un film dans la DB depuis l'API TMDB
 */
const createFilmFromPublicData = async (tmdbId) => {
  try {
    // Vérifier d'abord si le film existe déjà en base
    const [existingFilms] = await pool.execute('SELECT id FROM films WHERE tmdb_id = ?', [tmdbId]);
    if (existingFilms.length > 0) {
      return existingFilms[0].id;
    }

    // Récupérer le film depuis TMDB
    const tmdbFilm = await getMovieFromTMDB(tmdbId);
    if (!tmdbFilm) {
      return null;
    }

    // Insérer le film en base
    const [result] = await pool.execute(
      `INSERT INTO films (tmdb_id, titre, titre_original, synopsis, date_sortie, duree, affiche_url, note_moyenne, nombre_votes, genres, realisateur, casting)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tmdbFilm.tmdbId,
        tmdbFilm.titre,
        tmdbFilm.titreOriginal,
        tmdbFilm.synopsis,
        tmdbFilm.dateSortie,
        tmdbFilm.duree,
        tmdbFilm.afficheUrl,
        tmdbFilm.noteMoyenne,
        tmdbFilm.nombreVotes,
        JSON.stringify(tmdbFilm.genres || []),
        tmdbFilm.realisateur,
        JSON.stringify(tmdbFilm.casting || [])
      ]
    );

    return result.insertId;
  } catch (error) {
    console.error('Erreur lors de la création du film depuis TMDB:', error);
    return null;
  }
};

/**
 * Récupère les derniers films depuis la DB (pas de chargement automatique)
 */
const getLatestMovies = async (req, res) => {
  try {
    // Récupérer uniquement depuis la DB (films déjà ajoutés)
    const [films] = await pool.execute(`
      SELECT 
        f.id,
        f.tmdb_id,
        f.titre,
        f.titre_original,
        f.synopsis,
        f.date_sortie,
        f.duree,
        f.affiche_url,
        f.note_moyenne,
        f.nombre_votes,
        f.genres,
        f.realisateur,
        f.casting,
        f.created_at,
        f.updated_at,
        COALESCE(AVG(r.note), 0) as note_utilisateurs,
        COUNT(r.id) as nombre_reviews
      FROM films f
      LEFT JOIN reviews r ON f.id = r.film_id
      GROUP BY f.id, f.tmdb_id, f.titre, f.titre_original, f.synopsis, f.date_sortie, f.duree, f.affiche_url, f.note_moyenne, f.nombre_votes, f.genres, f.realisateur, f.casting, f.created_at, f.updated_at
      ORDER BY f.date_sortie DESC
      LIMIT 20
    `);

    res.json({
      films: films.map(film => ({
        id: film.id,
        tmdbId: film.tmdb_id,
        titre: film.titre,
        titreOriginal: film.titre_original,
        synopsis: film.synopsis,
        dateSortie: film.date_sortie,
        afficheUrl: film.affiche_url,
        noteMoyenne: parseFloat(film.note_moyenne),
        noteUtilisateurs: parseFloat(film.note_utilisateurs),
        nombreVotes: film.nombre_votes,
        nombreReviews: film.nombre_reviews,
        genres: parseJSON(film.genres) || []
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des films:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération des films'
    });
  }
};

/**
 * Récupère les détails d'un film
 */
const getMovieDetails = async (req, res) => {
  try {
    let { id } = req.params;
    let filmId = id;

    // Vérifier d'abord si c'est un ID local ou un tmdbId
    const [films] = await pool.execute(
      'SELECT * FROM films WHERE id = ? OR tmdb_id = ?',
      [id, id]
    );

    // Si pas trouvé et que c'est un nombre (tmdbId potentiel), essayer de le créer depuis TMDB
    if (films.length === 0 && !isNaN(id) && parseInt(id) > 1000) {
      const createdFilmId = await createFilmFromPublicData(parseInt(id));
      if (createdFilmId) {
        filmId = createdFilmId;
        // Récupérer le film créé
        const [createdFilms] = await pool.execute('SELECT * FROM films WHERE id = ?', [filmId]);
        if (createdFilms.length > 0) {
          const film = createdFilms[0];
          
          // Récupérer les reviews (vide pour un nouveau film)
          const reviewsWithReplies = [];

          res.json({
            film: {
              id: film.id,
              tmdbId: film.tmdb_id,
              titre: film.titre,
              titreOriginal: film.titre_original,
              synopsis: film.synopsis,
              dateSortie: film.date_sortie,
              duree: film.duree,
              afficheUrl: film.affiche_url,
              noteMoyenne: parseFloat(film.note_moyenne) || 0,
              nombreVotes: film.nombre_votes || 0,
              genres: parseJSON(film.genres) || [],
              realisateur: film.realisateur,
              casting: parseJSON(film.casting) || []
            },
            reviews: reviewsWithReplies
          });
          return;
        }
      }
      
      return res.status(404).json({
        error: 'Film non trouvé',
        message: 'Impossible de récupérer le film depuis TMDB'
      });
    }

    if (films.length === 0) {
      return res.status(404).json({
        error: 'Film non trouvé'
      });
    }

    const film = films[0];

    // Récupérer les reviews avec le nombre de likes
    const [reviews] = await pool.execute(`
      SELECT 
        r.id,
        r.user_id,
        r.film_id,
        r.note,
        r.commentaire,
        r.created_at,
        r.updated_at,
        u.id as user_id,
        u.pseudo, 
        u.photo_url,
        COUNT(DISTINCT rl.id) as likes_count
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN review_likes rl ON rl.review_id = r.id
      WHERE r.film_id = ?
      GROUP BY r.id, r.user_id, r.film_id, r.note, r.commentaire, r.created_at, r.updated_at, u.id, u.pseudo, u.photo_url
      ORDER BY r.created_at DESC
    `, [film.id]);

    // Pour chaque review, récupérer les réponses
    const reviewsWithReplies = await Promise.all(reviews.map(async (review) => {
      const [replies] = await pool.execute(`
        SELECT 
          cr.id,
          cr.message,
          cr.created_at,
          u.id as user_id,
          u.pseudo,
          u.photo_url
        FROM comment_replies cr
        JOIN users u ON cr.user_id = u.id
        WHERE cr.parent_review_id = ?
        ORDER BY cr.created_at ASC
      `, [review.id]);

      return {
        id: review.id,
        note: review.note,
        commentaire: review.commentaire,
        createdAt: review.created_at,
        likesCount: parseInt(review.likes_count) || 0,
        user: {
          id: review.user_id,
          pseudo: review.pseudo,
          photoUrl: review.photo_url
        },
        replies: replies.map(reply => ({
          id: reply.id,
          message: reply.message,
          createdAt: reply.created_at,
          user: {
            id: reply.user_id,
            pseudo: reply.pseudo,
            photoUrl: reply.photo_url
          }
        }))
      };
    }));

    res.json({
      film: {
        id: film.id,
        tmdbId: film.tmdb_id,
        titre: film.titre,
        titreOriginal: film.titre_original,
        synopsis: film.synopsis,
        dateSortie: film.date_sortie,
        duree: film.duree,
        afficheUrl: film.affiche_url,
        noteMoyenne: parseFloat(film.note_moyenne),
        nombreVotes: film.nombre_votes,
        genres: parseJSON(film.genres) || [],
        realisateur: film.realisateur,
        casting: parseJSON(film.casting) || []
      },
      reviews: reviewsWithReplies
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du film:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Crée un film manuellement (sans tmdbId)
 */
const createMovie = async (req, res) => {
  try {
    const { titre, titreOriginal, synopsis, dateSortie, duree, afficheUrl, realisateur, genres } = req.body;

    // Validation : le titre est obligatoire
    if (!titre || titre.trim().length === 0) {
      return res.status(400).json({
        error: 'Données invalides',
        message: 'Le titre est obligatoire'
      });
    }

    // Vérifier si un film avec le même titre existe déjà
    const [existingFilms] = await pool.execute(
      'SELECT id FROM films WHERE LOWER(titre) = LOWER(?) AND tmdb_id IS NULL',
      [titre.trim()]
    );

    if (existingFilms.length > 0) {
      return res.status(409).json({
        error: 'Film déjà existant',
        message: 'Un film avec ce titre existe déjà',
        filmId: existingFilms[0].id
      });
    }

    // Insérer le nouveau film
    const [result] = await pool.execute(
      `INSERT INTO films (titre, titre_original, synopsis, date_sortie, duree, affiche_url, realisateur, genres, note_moyenne, nombre_votes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      [
        titre.trim(),
        titreOriginal?.trim() || null,
        synopsis?.trim() || null,
        dateSortie || null,
        duree || null,
        afficheUrl?.trim() || null,
        realisateur?.trim() || null,
        genres ? JSON.stringify(Array.isArray(genres) ? genres : [genres]) : null
      ]
    );

    // Récupérer le film créé
    const [films] = await pool.execute('SELECT * FROM films WHERE id = ?', [result.insertId]);
    const film = films[0];

    res.status(201).json({
      message: 'Film créé avec succès',
      film: {
        id: film.id,
        tmdbId: film.tmdb_id,
        titre: film.titre,
        titreOriginal: film.titre_original,
        synopsis: film.synopsis,
        dateSortie: film.date_sortie,
        duree: film.duree,
        afficheUrl: film.affiche_url,
        noteMoyenne: parseFloat(film.note_moyenne) || 0,
        nombreVotes: film.nombre_votes || 0,
        genres: parseJSON(film.genres) || [],
        realisateur: film.realisateur
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création du film:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la création du film'
    });
  }
};

/**
 * Recherche des films par titre
 * Recherche insensible à la casse dans le titre et le titre original
 */
const searchMovies = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json({ films: [] });
    }

    const searchTerm = q.trim().toLowerCase();
    const searchTermSQL = `%${searchTerm}%`;

    // 1. Rechercher d'abord dans la base de données locale
    const [dbFilms] = await pool.execute(`
      SELECT 
        f.id,
        f.tmdb_id,
        f.titre,
        f.titre_original,
        f.synopsis,
        f.date_sortie,
        f.duree,
        f.affiche_url,
        f.note_moyenne,
        f.nombre_votes,
        f.genres,
        f.realisateur,
        f.casting,
        f.created_at,
        f.updated_at,
        COALESCE(AVG(r.note), 0) as note_utilisateurs,
        COUNT(r.id) as nombre_reviews
      FROM films f
      LEFT JOIN reviews r ON f.id = r.film_id
      WHERE LOWER(f.titre) LIKE ? OR LOWER(f.titre_original) LIKE ?
      GROUP BY f.id, f.tmdb_id, f.titre, f.titre_original, f.synopsis, f.date_sortie, f.duree, f.affiche_url, f.note_moyenne, f.nombre_votes, f.genres, f.realisateur, f.casting, f.created_at, f.updated_at
      ORDER BY f.date_sortie DESC
      LIMIT 20
    `, [searchTermSQL, searchTermSQL]);

    // Mapper les films de la DB
    const dbFilmsMapped = dbFilms.map(film => ({
      id: film.id,
      tmdbId: film.tmdb_id,
      titre: film.titre,
      titreOriginal: film.titre_original,
      synopsis: film.synopsis,
      dateSortie: film.date_sortie,
      afficheUrl: film.affiche_url,
      noteMoyenne: parseFloat(film.note_moyenne) || 0,
      noteUtilisateurs: parseFloat(film.note_utilisateurs) || 0,
      nombreVotes: film.nombre_votes || 0,
      nombreReviews: film.nombre_reviews || 0,
      genres: parseJSON(film.genres) || []
    }));

    // 2. Rechercher sur TMDB pour compléter les résultats
    let tmdbResults = [];
    try {
      const tmdbMovies = await searchMoviesOnTMDB(q.trim(), 1);
      
      // Créer un Set des tmdbId déjà présents dans la DB
      const dbTmdbIds = new Set(dbFilmsMapped.map(f => f.tmdbId));
      
      // Filtrer les résultats TMDB pour ne garder que ceux qui ne sont pas en DB
      tmdbResults = tmdbMovies
        .filter(movie => !dbTmdbIds.has(movie.tmdbId))
        .map(movie => ({
          id: null,
          tmdbId: movie.tmdbId,
          titre: movie.titre,
          titreOriginal: movie.titreOriginal,
          synopsis: movie.synopsis,
          dateSortie: movie.dateSortie,
          afficheUrl: movie.afficheUrl,
          noteMoyenne: parseFloat(movie.noteMoyenne) || 0,
          noteUtilisateurs: 0,
          nombreVotes: movie.nombreVotes || 0,
          nombreReviews: 0,
          genres: movie.genres || []
        }));
    } catch (tmdbError) {
      console.error('Erreur lors de la recherche TMDB:', tmdbError.message);
      // Continuer même si TMDB échoue
    }

    // Combiner les résultats : DB d'abord, puis résultats TMDB
    const allFilms = [...dbFilmsMapped, ...tmdbResults].slice(0, 50);

    res.json({ films: allFilms });
  } catch (error) {
    console.error('Erreur lors de la recherche de films:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la recherche'
    });
  }
};

module.exports = {
  getLatestMovies,
  getMovieDetails,
  searchMovies,
  createFilmFromPublicData,
  createMovie
};

