/**
 * Service pour récupérer les films depuis l'API TMDB
 */

const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY || '92d0cd14be4f3f096a6cdf3c62abd4e7';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

/**
 * Récupère les détails d'un film depuis TMDB par son ID
 * @param {number} tmdbId - ID TMDB du film
 * @returns {Promise<Object|null>} Détails du film formatés
 */
async function getMovieFromTMDB(tmdbId) {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'fr-FR'
      }
    });

    const movie = response.data;
    
    // Formater les genres (récupérer les noms)
    const genres = movie.genres ? movie.genres.map(g => g.name) : [];
    
    // Récupérer le réalisateur et le casting depuis les crédits
    let realisateur = null;
    let casting = [];
    
    try {
      const creditsResponse = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}/credits`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'fr-FR'
        }
      });
      
      const director = creditsResponse.data.crew?.find(person => person.job === 'Director');
      if (director) {
        realisateur = director.name;
      }
      
      // Récupérer les 10 premiers acteurs principaux
      casting = creditsResponse.data.cast?.slice(0, 10).map(actor => actor.name) || [];
    } catch (creditsError) {
      console.error('Erreur lors de la récupération des crédits:', creditsError.message);
    }

    return {
      tmdbId: movie.id,
      titre: movie.title,
      titreOriginal: movie.original_title,
      synopsis: movie.overview || '',
      dateSortie: movie.release_date || null,
      duree: movie.runtime || null,
      afficheUrl: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
      noteMoyenne: movie.vote_average ? parseFloat((movie.vote_average / 2).toFixed(1)) : 0, // Convertir de 10 à 5
      nombreVotes: movie.vote_count || 0,
      genres: genres,
      realisateur: realisateur,
      casting: casting
    };
  } catch (error) {
    console.error(`Erreur lors de la récupération du film TMDB ${tmdbId}:`, error.message);
    if (error.response?.status === 404) {
      return null;
    }
    if (error.response?.status === 429) {
      const rateLimitError = new Error('Trop de requêtes vers l\'API TMDB. Veuillez patienter quelques instants.');
      rateLimitError.status = 429;
      throw rateLimitError;
    }
    throw error;
  }
}

/**
 * Récupère les films les mieux notés depuis TMDB
 * @param {number} page - Numéro de page (défaut: 1)
 * @returns {Promise<Array>} Liste des films
 */
async function getTopRatedMoviesFromTMDB(page = 1) {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/top_rated`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'fr-FR',
        page: page
      }
    });

    return response.data.results.map(movie => ({
      tmdbId: movie.id,
      titre: movie.title,
      titreOriginal: movie.original_title,
      synopsis: movie.overview || '',
      dateSortie: movie.release_date || null,
      afficheUrl: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
      noteMoyenne: movie.vote_average ? parseFloat((movie.vote_average / 2).toFixed(1)) : 0, // Convertir de 10 à 5
      nombreVotes: movie.vote_count || 0,
      genres: [] // Les genres ne sont pas inclus dans les résultats de la liste
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des films mieux notés TMDB:', error.message);
    if (error.response?.status === 429) {
      const rateLimitError = new Error('Trop de requêtes vers l\'API TMDB. Veuillez patienter quelques instants.');
      rateLimitError.status = 429;
      throw rateLimitError;
    }
    throw error;
  }
}

/**
 * Récupère les films les plus récents depuis TMDB
 * Utilise l'endpoint "upcoming" pour les films à venir et "now_playing" pour les films en salle
 * @param {number} page - Numéro de page (défaut: 1)
 * @returns {Promise<Array>} Liste des films
 */
async function getLatestMoviesFromTMDB(page = 1) {
  try {
    // Récupérer les films à venir et en salle, puis combiner et trier par date
    const [upcomingResponse, nowPlayingResponse] = await Promise.all([
      axios.get(`${TMDB_BASE_URL}/movie/upcoming`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'fr-FR',
          page: page
        }
      }),
      axios.get(`${TMDB_BASE_URL}/movie/now_playing`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'fr-FR',
          page: page
        }
      })
    ]);

    // Combiner les résultats
    const allMovies = [
      ...upcomingResponse.data.results,
      ...nowPlayingResponse.data.results
    ];

    // Créer un Set pour éviter les doublons par ID
    const uniqueMovies = new Map();
    allMovies.forEach(movie => {
      if (!uniqueMovies.has(movie.id)) {
        uniqueMovies.set(movie.id, movie);
      }
    });

    // Convertir en array et trier par date de sortie décroissante
    const sortedMovies = Array.from(uniqueMovies.values())
      .sort((a, b) => {
        const dateA = new Date(a.release_date || 0);
        const dateB = new Date(b.release_date || 0);
        return dateB - dateA;
      });

    return sortedMovies.map(movie => ({
      tmdbId: movie.id,
      titre: movie.title,
      titreOriginal: movie.original_title,
      synopsis: movie.overview || '',
      dateSortie: movie.release_date || null,
      afficheUrl: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
      noteMoyenne: movie.vote_average ? parseFloat((movie.vote_average / 2).toFixed(1)) : 0, // Convertir de 10 à 5
      nombreVotes: movie.vote_count || 0,
      genres: [] // Les genres ne sont pas inclus dans les résultats de la liste
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des films récents TMDB:', error.message);
    if (error.response?.status === 429) {
      const rateLimitError = new Error('Trop de requêtes vers l\'API TMDB. Veuillez patienter quelques instants.');
      rateLimitError.status = 429;
      throw rateLimitError;
    }
    throw error;
  }
}

/**
 * Recherche des films sur TMDB
 * @param {string} query - Terme de recherche
 * @param {number} page - Numéro de page (défaut: 1)
 * @returns {Promise<Array>} Liste des films trouvés
 */
async function searchMoviesOnTMDB(query, page = 1) {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        query: query,
        language: 'fr-FR',
        page: page
      }
    });

    return response.data.results.map(movie => ({
      tmdbId: movie.id,
      titre: movie.title,
      titreOriginal: movie.original_title,
      synopsis: movie.overview || '',
      dateSortie: movie.release_date || null,
      afficheUrl: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
      noteMoyenne: movie.vote_average ? parseFloat((movie.vote_average / 2).toFixed(1)) : 0, // Convertir de 10 à 5
      nombreVotes: movie.vote_count || 0,
      genres: [] // Les genres ne sont pas inclus dans les résultats de recherche
    }));
  } catch (error) {
    console.error('Erreur lors de la recherche TMDB:', error.message);
    if (error.response?.status === 429) {
      const rateLimitError = new Error('Trop de requêtes vers l\'API TMDB. Veuillez patienter quelques instants.');
      rateLimitError.status = 429;
      throw rateLimitError;
    }
    throw error;
  }
}

module.exports = {
  getMovieFromTMDB,
  searchMoviesOnTMDB,
  getTopRatedMoviesFromTMDB,
  getLatestMoviesFromTMDB
};
