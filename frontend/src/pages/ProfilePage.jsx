/**
 * Page de profil utilisateur
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getUserProfile, updateProfile, getUserGroups, addFavoriteFilm, removeFavoriteFilm, followUser, unfollowUser } from '../services/userService';
import { getCurrentUser } from '../services/authService';
import { searchMovies } from '../services/movieService';
import StarRating from '../components/StarRating';
import useDebounce from '../hooks/useDebounce';
import useRefreshData from '../hooks/useRefreshData';
import './ProfilePage.css';

function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const isOwnProfile = currentUser && parseInt(userId) === currentUser.id;

  const [profile, setProfile] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showAddFavorite, setShowAddFavorite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [formData, setFormData] = useState({
    pseudo: '',
    bio: '',
    photoUrl: '',
    genresPreferences: []
  });
  const [error, setError] = useState('');
  const searchInputRef = useRef(null);

  // Debounce de la requête de recherche pour les films préférés (500ms de délai)
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Recherche automatique quand la valeur debouncée change (pour les films préférés)
  useEffect(() => {
    const performSearch = async () => {
      // Si la recherche est vide ou si le formulaire n'est pas ouvert, réinitialiser
      if (!showAddFavorite || !debouncedSearchQuery.trim()) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }

      // Effectuer la recherche
      setSearchLoading(true);
      try {
        const data = await searchMovies(debouncedSearchQuery.trim());
        setSearchResults(data.films || []);
      } catch (err) {
        console.error('Erreur lors de la recherche:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, showAddFavorite]);

  // Focus automatique sur le champ de recherche quand le formulaire s'ouvre
  useEffect(() => {
    if (showAddFavorite && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showAddFavorite]);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile(userId);
      setProfile(data);
      setFormData({
        pseudo: data.user.pseudo || '',
        bio: data.user.bio || '',
        photoUrl: data.user.photoUrl || '',
        genresPreferences: data.user.genresPreferences || []
      });
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const data = await getUserGroups(userId);
      setGroups(data.groupes || []);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  // Fonction pour rafraîchir toutes les données
  const refreshAllData = () => {
    loadProfile();
    loadGroups();
  };

  useEffect(() => {
    refreshAllData();
  }, [userId]);

  // Gérer le raccourci Ctrl+Shift+R pour rafraîchir les données
  useRefreshData(refreshAllData);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await updateProfile(formData);
      setEditing(false);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
    // Afficher le loader immédiatement pendant la saisie
    if (e.target.value.trim()) {
      setSearchLoading(true);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleAddFavorite = async (filmId) => {
    try {
      await addFavoriteFilm(filmId);
      setShowAddFavorite(false);
      setSearchQuery('');
      setSearchResults([]);
      setSearchLoading(false);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'ajout du film');
    }
  };

  const handleRemoveFavorite = async (filmId) => {
    try {
      await removeFavoriteFilm(filmId);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression du film');
    }
  };

  const handleToggleFollow = async () => {
    if (followingLoading || isOwnProfile) return;
    
    setFollowingLoading(true);
    setError('');
    try {
      if (profile.isFollowing) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
      loadProfile(); // Recharger le profil pour mettre à jour le statut
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'opération');
    } finally {
      setFollowingLoading(false);
    }
  };

  if (loading) {
    return <div className="profile-page"><div className="loading">Chargement...</div></div>;
  }

  if (!profile) {
    return <div className="profile-page"><div className="error">Profil non trouvé</div></div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <button onClick={() => navigate(-1)} className="back-button">← Retour</button>
        <div className="profile-header">
          {profile.user.photoUrl && (
            <img src={profile.user.photoUrl} alt={profile.user.pseudo} className="profile-photo" />
          )}
          <div className="profile-info">
            <div className="profile-name-section">
              <h1>{profile.user.pseudo}</h1>
              {!isOwnProfile && (
                <button 
                  onClick={handleToggleFollow}
                  className={`follow-btn ${profile.isFollowing ? 'following' : ''}`}
                  disabled={followingLoading}
                >
                  {followingLoading ? '...' : (profile.isFollowing ? '✓ Suivi' : '+ Suivre')}
                </button>
              )}
            </div>
            {profile.user.bio && <p className="profile-bio">{profile.user.bio}</p>}
            <div className="profile-follow-stats">
              <span className="follow-stat">
                <strong>{profile.followersCount || 0}</strong> abonné{profile.followersCount !== 1 ? 's' : ''}
              </span>
              <span className="follow-stat">
                <strong>{profile.followingCount || 0}</strong> abonnement{profile.followingCount !== 1 ? 's' : ''}
              </span>
            </div>
            {isOwnProfile && (
              <button onClick={() => setEditing(!editing)} className="edit-btn">
                {editing ? 'Annuler' : 'Modifier le profil'}
              </button>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {editing && isOwnProfile ? (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>Pseudo</label>
              <input
                type="text"
                name="pseudo"
                value={formData.pseudo}
                onChange={handleChange}
                placeholder="Votre pseudo"
              />
            </div>
            <div className="form-group">
              <label>Biographie</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Parlez-nous de vous..."
                rows="4"
              />
            </div>
            <div className="form-group">
              <label>Photo (URL)</label>
              <input
                type="text"
                name="photoUrl"
                value={formData.photoUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>
            <button type="submit" className="submit-button">Enregistrer</button>
          </form>
        ) : (
          <>
            <div className="profile-stats">
              <div className="stat-item">
                <strong>{profile.stats.nombre_reviews}</strong>
                <span>Reviews</span>
              </div>
              <div className="stat-item">
                <strong>{profile.stats.nombre_groupes}</strong>
                <span>Groupes</span>
              </div>
            </div>

            {profile.user.genresPreferences && profile.user.genresPreferences.length > 0 && (
              <div className="profile-genres">
                <h3>Genres préférés</h3>
                <div className="genres-list">
                  {profile.user.genresPreferences.map((genre, idx) => (
                    <span key={idx} className="genre-tag">{genre}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Films préférés */}
            <div className="profile-favorites">
              <div className="section-header">
                <h3>Mes 5 films préférés</h3>
                {isOwnProfile && (
                  <button 
                    onClick={() => setShowAddFavorite(!showAddFavorite)} 
                    className="add-favorite-btn"
                    disabled={profile.favoriteFilms && profile.favoriteFilms.length >= 5}
                  >
                    {showAddFavorite ? 'Annuler' : '+ Ajouter'}
                  </button>
                )}
              </div>
              
              {showAddFavorite && isOwnProfile && (
                <div className="add-favorite-form">
                  <div className="favorite-search-wrapper">
                    <div className="favorite-search-input-container">
                      <span className="search-icon">🔍</span>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchInputChange}
                        placeholder="Tapez le nom d'un film (ex: Fight Club, Inception...)"
                        className="favorite-search-input"
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
                      {searchLoading && <span className="search-loading-spinner">⏳</span>}
                    </div>
                  </div>

                  {searchLoading && searchQuery && (
                    <div className="search-status">
                      <p>Recherche en cours...</p>
                    </div>
                  )}

                  {searchResults.length > 0 && !searchLoading && (
                    <div className="search-results">
                      <div className="results-header">
                        <span className="results-count">{searchResults.length} film{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}</span>
                      </div>
                      {searchResults.map(film => (
                        <div key={film.id || film.tmdbId} className="search-result-item">
                          {film.afficheUrl && (
                            <img src={film.afficheUrl} alt={film.titre} className="result-poster" />
                          )}
                          <div className="result-info">
                            <h4>{film.titre}</h4>
                            {film.titreOriginal && film.titreOriginal !== film.titre && (
                              <p className="result-original-title">{film.titreOriginal}</p>
                            )}
                            {film.dateSortie && (
                              <p className="result-year">{new Date(film.dateSortie).getFullYear()}</p>
                            )}
                            {film.noteMoyenne > 0 && (
                              <p className="result-rating">⭐ {film.noteMoyenne.toFixed(1)}/10</p>
                            )}
                          </div>
                          <button 
                            onClick={() => handleAddFavorite(film.id || film.tmdbId)}
                            className="add-btn"
                            disabled={profile.favoriteFilms && profile.favoriteFilms.length >= 5}
                          >
                            {profile.favoriteFilms && profile.favoriteFilms.length >= 5 ? 'Limite atteinte' : 'Ajouter'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.length === 0 && searchQuery && !searchLoading && (
                    <div className="no-results">
                      <p>Aucun film trouvé pour "{searchQuery}"</p>
                    </div>
                  )}

                  {!searchQuery && (
                    <div className="search-placeholder">
                      <p>Commencez à taper pour rechercher un film</p>
                    </div>
                  )}
                </div>
              )}

              {profile.favoriteFilms && profile.favoriteFilms.length > 0 ? (
                <div className="favorites-grid">
                  {profile.favoriteFilms.map((film, index) => (
                    <div key={film.id} className="favorite-film-card">
                      {film.afficheUrl && (
                        <img src={film.afficheUrl} alt={film.titre} className="favorite-poster" />
                      )}
                      <div className="favorite-info">
                        <h4>{film.titre}</h4>
                        {film.dateSortie && (
                          <p className="favorite-year">{new Date(film.dateSortie).getFullYear()}</p>
                        )}
                        {isOwnProfile && (
                          <button 
                            onClick={() => handleRemoveFavorite(film.id)}
                            className="remove-favorite-btn"
                          >
                            Retirer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-message">Aucun film préféré pour le moment</p>
              )}
            </div>

            {/* 3 dernières reviews */}
            {profile.recentReviews && profile.recentReviews.length > 0 && (
              <div className="profile-reviews">
                <h3>Mes 3 dernières reviews</h3>
                <div className="reviews-list">
                  {profile.recentReviews.map(review => (
                    <div key={review.id} className="review-item">
                      <div className="review-film">
                        {review.film.afficheUrl && (
                          <img src={review.film.afficheUrl} alt={review.film.titre} className="review-poster" />
                        )}
                        <div className="review-film-info">
                          <h4>{review.film.titre}</h4>
                          <div className="review-rating">
                            <StarRating value={review.note} readonly={true} maxStars={5} />
                          </div>
                        </div>
                      </div>
                      {review.commentaire && (
                        <p className="review-comment">{review.commentaire}</p>
                      )}
                      <p className="review-date">
                        {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {groups.length > 0 && (
              <div className="profile-groups">
                <h3>Groupes ({groups.length})</h3>
                <div className="groups-list">
                  {groups.map(group => (
                    <div key={group.id} className="group-card" onClick={() => navigate(`/groupes/${group.id}`)}>
                      <h4>{group.titre}</h4>
                      {group.description && <p>{group.description}</p>}
                      <span className="group-role">{group.userRole}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;

