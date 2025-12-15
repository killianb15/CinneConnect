/**
 * Page de recherche de films pour créer des reviews
 * Recherche en temps réel avec debounce
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMovies, createMovie } from '../services/movieService';
import { createOrUpdateReview } from '../services/reviewService';
import { getCurrentUser, isAuthenticated } from '../services/authService';
import StarRating from '../components/StarRating';
import useDebounce from '../hooks/useDebounce';
import useRefreshData from '../hooks/useRefreshData';
import './SearchMoviesPage.css';

function SearchMoviesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({
    note: 0,
    commentaire: ''
  });
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showAddMovieForm, setShowAddMovieForm] = useState(false);
  const [newMovieData, setNewMovieData] = useState({
    titre: '',
    titreOriginal: '',
    synopsis: '',
    dateSortie: '',
    duree: '',
    afficheUrl: '',
    realisateur: '',
    genres: []
  });
  const [addingMovie, setAddingMovie] = useState(false);
  const searchInputRef = useRef(null);

  // Debounce de la requête de recherche (500ms de délai)
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Recherche automatique quand la valeur debouncée change
  useEffect(() => {
    const performSearch = async () => {
      // Si la recherche est vide, réinitialiser
      if (!debouncedSearchQuery.trim()) {
        setFilms([]);
        setError('');
        setHasSearched(false);
        setLoading(false);
        return;
      }

      // Effectuer la recherche
      setLoading(true);
      setError('');
      setSelectedFilm(null);
      setShowReviewForm(false);
      setHasSearched(true);

      try {
        const data = await searchMovies(debouncedSearchQuery.trim());
        setFilms(data.films || []);
        if (data.films && data.films.length === 0) {
          setError(`Aucun film trouvé pour "${debouncedSearchQuery.trim()}"`);
        } else {
          setError('');
        }
      } catch (err) {
        setError('Erreur lors de la recherche. Veuillez réessayer.');
        console.error('Erreur recherche:', err);
        setFilms([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery]);

  // Focus automatique sur le champ de recherche au chargement
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Fonction pour rafraîchir la recherche actuelle
  const refreshSearch = async () => {
    if (searchQuery.trim()) {
      setLoading(true);
      setError('');
      try {
        const data = await searchMovies(searchQuery.trim());
        setFilms(data.films || []);
        if (data.films && data.films.length === 0) {
          setError(`Aucun film trouvé pour "${searchQuery.trim()}"`);
        } else {
          setError('');
        }
      } catch (err) {
        setError('Erreur lors de la recherche. Veuillez réessayer.');
        console.error('Erreur recherche:', err);
        setFilms([]);
      } finally {
        setLoading(false);
      }
    }
  };

  // Gérer le raccourci Ctrl+Shift+R pour rafraîchir les données
  useRefreshData(refreshSearch);

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    // Afficher le loader immédiatement pendant la saisie
    if (e.target.value.trim()) {
      setLoading(true);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setFilms([]);
    setError('');
    setHasSearched(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleFilmSelect = (film) => {
    // Ouvrir le formulaire de review directement
    setSelectedFilm(film);
    setShowReviewForm(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedFilm) return;

    try {
      // Utiliser l'ID local si disponible, sinon utiliser "new" pour indiquer qu'il faut créer le film
      const filmId = selectedFilm.id || 'new';
      
      if (reviewData.note === 0) {
        setError('Veuillez sélectionner une note');
        return;
      }

      await createOrUpdateReview(filmId, {
        note: reviewData.note,
        commentaire: reviewData.commentaire,
        tmdbId: selectedFilm.tmdbId // Envoyer le tmdbId pour créer le film si nécessaire
      });

      // Fermer le modal et recharger les résultats
      setShowReviewForm(false);
      setReviewData({ note: 0, commentaire: '' });
      
      // Recharger la recherche pour avoir les IDs mis à jour
      if (searchQuery) {
        const data = await searchMovies(searchQuery);
        setFilms(data.films || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création de la review');
      console.error(err);
    }
  };

  const handleAddMovie = async (e) => {
    e.preventDefault();
    setError('');
    setAddingMovie(true);

    try {
      if (!newMovieData.titre.trim()) {
        setError('Le titre est obligatoire');
        setAddingMovie(false);
        return;
      }

      const createdMovie = await createMovie(newMovieData);
      
      // Fermer le formulaire et réinitialiser
      setShowAddMovieForm(false);
      setNewMovieData({
        titre: '',
        titreOriginal: '',
        synopsis: '',
        dateSortie: '',
        duree: '',
        afficheUrl: '',
        realisateur: '',
        genres: []
      });

      // Recharger la recherche pour voir le nouveau film
      if (searchQuery) {
        const data = await searchMovies(searchQuery);
        setFilms(data.films || []);
      } else {
        // Si pas de recherche, naviguer vers la page du film
        navigate(`/films/${createdMovie.film.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erreur lors de la création du film');
      console.error(err);
    } finally {
      setAddingMovie(false);
    }
  };

  return (
    <div className="search-movies-page">
      <div className="search-container">
        <button onClick={() => navigate(-1)} className="back-button">← Retour</button>
        
        <div className="search-header">
          <h1>🔍 Rechercher un film</h1>
          <p>Tapez le nom d'un film pour rechercher en temps réel</p>
        </div>

        <div className="search-form-wrapper">
          <div className="search-input-container">
            <span className="search-icon">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              placeholder="Tapez le nom d'un film (ex: Fight Club, Inception...)"
              className="search-input"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={handleClearSearch} 
                className="clear-search-button"
                aria-label="Effacer la recherche"
              >
                ✕
              </button>
            )}
            {loading && <span className="search-loading-spinner">⏳</span>}
          </div>
        </div>

        {/* Indicateur de recherche en cours */}
        {loading && searchQuery && (
          <div className="search-status">
            <p>Recherche en cours...</p>
          </div>
        )}

        {/* Message d'erreur */}
        {error && hasSearched && (
          <div className="error-message">{error}</div>
        )}

        {/* Résultats de recherche */}
        {films.length > 0 && !loading && (
          <div className="films-results">
            <div className="results-header">
              <h2>Résultats de recherche</h2>
              <span className="results-count">{films.length} film{films.length > 1 ? 's' : ''} trouvé{films.length > 1 ? 's' : ''}</span>
            </div>
            <div className="films-grid">
              {films.map(film => (
                <div key={film.id || film.tmdbId} className="film-card" onClick={async () => {
                  if (film.id) {
                    navigate(`/films/${film.id}`);
                  } else if (film.tmdbId) {
                    // Si pas d'ID local mais un tmdbId, sélectionner pour créer la review
                    // Le film sera automatiquement créé lors de la soumission de la review
                    handleFilmSelect(film);
                  } else {
                    // Fallback pour les films sans ID ni tmdbId
                    handleFilmSelect(film);
                  }
                }}>
                  {film.afficheUrl && (
                    <img src={film.afficheUrl} alt={film.titre} className="film-poster" />
                  )}
                  <div className="film-info">
                    <h3>{film.titre}</h3>
                    {film.titreOriginal && film.titreOriginal !== film.titre && (
                      <p className="film-original-title">{film.titreOriginal}</p>
                    )}
                    {film.dateSortie && (
                      <p className="film-year">{new Date(film.dateSortie).getFullYear()}</p>
                    )}
                    {film.noteMoyenne > 0 && (
                      <div className="film-rating">
                        ⭐ {film.noteMoyenne.toFixed(1)}/5
                      </div>
                    )}
                    {film.nombreReviews > 0 && (
                      <p className="film-reviews-count">{film.nombreReviews} review{film.nombreReviews > 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message quand aucun résultat */}
        {films.length === 0 && hasSearched && !loading && searchQuery && (
          <div className="no-results">
            <p className="no-results-icon">🎬</p>
            <p className="no-results-text">Aucun film trouvé pour "{searchQuery}"</p>
            <p className="no-results-hint">Essayez avec un autre terme de recherche</p>
            {isAuthenticated() && (
              <button 
                onClick={() => {
                  setNewMovieData({ ...newMovieData, titre: searchQuery });
                  setShowAddMovieForm(true);
                }}
                className="add-movie-button"
              >
                ➕ Ajouter ce film manuellement
              </button>
            )}
          </div>
        )}

        {/* Message initial */}
        {!hasSearched && !loading && (
          <div className="search-placeholder">
            <p className="placeholder-icon">🎥</p>
            <p className="placeholder-text">Commencez à taper pour rechercher un film</p>
            <p className="placeholder-hint">La recherche se fait automatiquement pendant que vous tapez</p>
          </div>
        )}
      </div>

      {showReviewForm && selectedFilm && (
        <div className="review-modal-overlay" onClick={() => setShowReviewForm(false)}>
          <div className="review-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Ajouter une review pour "{selectedFilm.titre}"</h2>
            <form onSubmit={handleReviewSubmit}>
              <div className="form-group">
                <label>Note *</label>
                <StarRating
                  value={reviewData.note}
                  onChange={(rating) => setReviewData({ ...reviewData, note: rating })}
                  maxStars={5}
                />
                {reviewData.note === 0 && (
                  <p className="rating-hint">Veuillez sélectionner une note</p>
                )}
              </div>
              <div className="form-group">
                <label>Commentaire</label>
                <textarea
                  value={reviewData.commentaire}
                  onChange={(e) => setReviewData({ ...reviewData, commentaire: e.target.value })}
                  rows="5"
                  placeholder="Partagez votre avis sur ce film..."
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="form-actions">
                <button type="submit" className="submit-button">Publier la review</button>
                <button type="button" onClick={() => setShowReviewForm(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddMovieForm && (
        <div className="review-modal-overlay" onClick={() => setShowAddMovieForm(false)}>
          <div className="review-modal add-movie-modal" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Ajouter un nouveau film</h2>
            <form onSubmit={handleAddMovie}>
              <div className="form-group">
                <label>Titre *</label>
                <input
                  type="text"
                  value={newMovieData.titre}
                  onChange={(e) => setNewMovieData({ ...newMovieData, titre: e.target.value })}
                  placeholder="Titre du film"
                  required
                />
              </div>
              <div className="form-group">
                <label>Titre original</label>
                <input
                  type="text"
                  value={newMovieData.titreOriginal}
                  onChange={(e) => setNewMovieData({ ...newMovieData, titreOriginal: e.target.value })}
                  placeholder="Titre original (optionnel)"
                />
              </div>
              <div className="form-group">
                <label>Réalisateur</label>
                <input
                  type="text"
                  value={newMovieData.realisateur}
                  onChange={(e) => setNewMovieData({ ...newMovieData, realisateur: e.target.value })}
                  placeholder="Nom du réalisateur (optionnel)"
                />
              </div>
              <div className="form-group">
                <label>Date de sortie</label>
                <input
                  type="date"
                  value={newMovieData.dateSortie}
                  onChange={(e) => setNewMovieData({ ...newMovieData, dateSortie: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Durée (minutes)</label>
                <input
                  type="number"
                  value={newMovieData.duree}
                  onChange={(e) => setNewMovieData({ ...newMovieData, duree: e.target.value })}
                  placeholder="Durée en minutes (optionnel)"
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>URL de l'affiche</label>
                <input
                  type="url"
                  value={newMovieData.afficheUrl}
                  onChange={(e) => setNewMovieData({ ...newMovieData, afficheUrl: e.target.value })}
                  placeholder="https://exemple.com/affiche.jpg (optionnel)"
                />
              </div>
              <div className="form-group">
                <label>Synopsis</label>
                <textarea
                  value={newMovieData.synopsis}
                  onChange={(e) => setNewMovieData({ ...newMovieData, synopsis: e.target.value })}
                  rows="4"
                  placeholder="Résumé du film (optionnel)"
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="form-actions">
                <button type="submit" className="submit-button" disabled={addingMovie}>
                  {addingMovie ? 'Ajout en cours...' : 'Ajouter le film'}
                </button>
                <button type="button" onClick={() => {
                  setShowAddMovieForm(false);
                  setError('');
                }} disabled={addingMovie}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchMoviesPage;

