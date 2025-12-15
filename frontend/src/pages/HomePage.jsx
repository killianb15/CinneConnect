/**
 * Page d'accueil
 * - Si non connecté : affiche les derniers films + formulaires de connexion/inscription
 * - Si connecté : affiche les reviews récentes des utilisateurs
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isAuthenticated, getCurrentUser, logout } from '../services/authService';
import { getLatestMovies } from '../services/movieService';
import { getFeed, getGlobalFeed } from '../services/feedService';
import { getFriendRequests, acceptFriendRequest, rejectFriendRequest } from '../services/friendService';
import NotificationBell from '../components/NotificationBell';
import StarRating from '../components/StarRating';
import AuthModal from '../components/AuthModal';
import useRefreshData from '../hooks/useRefreshData';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [user, setUser] = useState(getCurrentUser());
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // État pour les films (non connecté)
  const [films, setFilms] = useState([]);
  const [loadingFilms, setLoadingFilms] = useState(false);
  
  // État pour le fil d'actualité
  const [feed, setFeed] = useState([]);
  const [topRatedFilms, setTopRatedFilms] = useState([]);
  const [recentFilms, setRecentFilms] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // État pour les demandes d'amis
  const [friendRequests, setFriendRequests] = useState([]);
  const [loadingFriendRequests, setLoadingFriendRequests] = useState(false);

  const loadFilms = async () => {
    setLoadingFilms(true);
    try {
      const data = await getLatestMovies();
      setFilms(data.films || []);
    } catch (err) {
      console.error('Erreur lors du chargement des films:', err);
    } finally {
      setLoadingFilms(false);
    }
  };

  const loadFeed = async () => {
    setLoadingFeed(true);
    try {
      let data;
      if (isLoggedIn) {
        // Fil d'actualité des amis pour utilisateurs connectés
        data = await getFeed();
      } else {
        // Fil d'actualité global pour utilisateurs non connectés
        data = await getGlobalFeed();
      }
      setFeed(data.feed || []);
      setTopRatedFilms(data.topRatedFilms || []);
      setRecentFilms(data.recentFilms || []);
    } catch (err) {
      console.error('Erreur lors du chargement du fil d\'actualité:', err);
    } finally {
      setLoadingFeed(false);
    }
  };

  const loadFriendRequests = async () => {
    setLoadingFriendRequests(true);
    try {
      const data = await getFriendRequests();
      setFriendRequests(data.requests || []);
    } catch (err) {
      console.error('Erreur lors du chargement des demandes d\'amis:', err);
    } finally {
      setLoadingFriendRequests(false);
    }
  };

  // Fonction pour rafraîchir toutes les données
  const refreshAllData = useCallback(() => {
    loadFeed();
    if (isLoggedIn) {
      loadFriendRequests();
    } else {
      loadFilms();
    }
  }, [isLoggedIn]);

  // Charger le fil d'actualité (global si non connecté, amis si connecté)
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Gérer le raccourci Ctrl+Shift+R pour rafraîchir les données
  useRefreshData(refreshAllData);

  const handleAcceptFriendRequest = async (userId) => {
    try {
      await acceptFriendRequest(userId);
      await loadFriendRequests();
      await loadFeed(); // Recharger le feed pour voir les nouvelles reviews
    } catch (err) {
      console.error('Erreur lors de l\'acceptation de la demande:', err);
    }
  };

  const handleRejectFriendRequest = async (userId) => {
    try {
      await rejectFriendRequest(userId);
      await loadFriendRequests();
    } catch (err) {
      console.error('Erreur lors du test refus de la demande:', err);
    }
  };

  const handleAuthSuccess = () => {
    setIsLoggedIn(true);
    setUser(getCurrentUser());
    loadFeed();
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setUser(null);
    setFeed([]);
  };

  // Vue pour utilisateur connecté
  if (isLoggedIn) {
    return (
      <div className="home-page">
        <div className="home-container">
          <div className="header-section">
            <h1>🎬 CinéConnect</h1>
            <div className="user-info">
              <NotificationBell onGroupAccepted={(groupId) => navigate(`/groupes/${groupId}`)} />
              <span>Bonjour, {user?.pseudo}!</span>
              <Link to={`/profil/${user?.id}`} className="nav-link">Mon profil</Link>
              <Link to="/groupes" className="nav-link">Groupes</Link>
              <Link to="/recherche-films" className="nav-link">🔍 Rechercher un film</Link>
              {user?.role === 'admin' && (
                <Link to="/moderation" className="nav-link">🛡️ Back Office</Link>
              )}
              <button onClick={handleLogout} className="logout-btn">Déconnexion</button>
            </div>
          </div>

          {/* Films les mieux notés */}
          <div className="featured-films-section">
            <h3>⭐ Films les mieux notés</h3>
            {loadingFeed ? (
              <div className="loading">Les films chargent...</div>
            ) : topRatedFilms.length > 0 ? (
              <div className="featured-films-grid">
                {topRatedFilms.map(film => (
                  <Link key={film.id || film.tmdbId} to={`/films/${film.id || film.tmdbId}`} className="featured-film-card">
                    {film.afficheUrl && (
                      <img src={film.afficheUrl} alt={film.titre} className="featured-film-poster" />
                    )}
                    <div className="featured-film-info">
                      <h4>{film.titre}</h4>
                      {film.dateSortie && (
                        <p className="featured-film-year">{new Date(film.dateSortie).getFullYear()}</p>
                      )}
                      <div className="featured-film-rating">
                        <StarRating value={Math.round(film.noteMoyenne)} readonly={true} maxStars={5} />
                        <span className="rating-value">{film.noteMoyenne.toFixed(1)}/5</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">Aucun film disponible</div>
            )}
          </div>

          {/* Films les plus récents */}
          <div className="featured-films-section">
            <h3>🆕 Films les plus récents</h3>
            {loadingFeed ? (
              <div className="loading">Les films chargent...</div>
            ) : recentFilms.length > 0 ? (
              <div className="featured-films-grid">
                {recentFilms.map(film => (
                  <Link key={film.id || film.tmdbId} to={`/films/${film.id || film.tmdbId}`} className="featured-film-card">
                    {film.afficheUrl && (
                      <img src={film.afficheUrl} alt={film.titre} className="featured-film-poster" />
                    )}
                    <div className="featured-film-info">
                      <h4>{film.titre}</h4>
                      {film.dateSortie && (
                        <p className="featured-film-year">{new Date(film.dateSortie).getFullYear()}</p>
                      )}
                      {film.noteMoyenne > 0 && (
                        <div className="featured-film-rating">
                          <StarRating value={Math.round(film.noteMoyenne)} readonly={true} maxStars={5} />
                          <span className="rating-value">{film.noteMoyenne.toFixed(1)}/5</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">Aucun film disponible</div>
            )}
          </div>

          {/* Section des demandes d'amis */}
          {friendRequests.length > 0 && (
            <div className="friend-requests-section">
              <h3>📬 Demandes d'amis ({friendRequests.length})</h3>
              <div className="friend-requests-list">
                {friendRequests.map(request => (
                  <div key={request.id} className="friend-request-item">
                    <div className="friend-request-user">
                      {request.requester.photoUrl ? (
                        <img src={request.requester.photoUrl} alt={request.requester.pseudo} className="friend-request-photo" />
                      ) : (
                        <div className="friend-request-photo-placeholder">
                          {request.requester.pseudo.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="friend-request-info">
                        <strong>{request.requester.pseudo}</strong>
                        {request.requester.bio && <span className="friend-request-bio">{request.requester.bio}</span>}
                      </div>
                    </div>
                    <div className="friend-request-actions">
                      <button
                        onClick={() => handleAcceptFriendRequest(request.requester.id)}
                        className="accept-btn"
                      >
                        ✅ Accepter
                      </button>
                      <button
                        onClick={() => handleRejectFriendRequest(request.requester.id)}
                        className="reject-btn"
                      >
                        ❌ Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fil d'Actualité */}
          <div className="feed-header-section">
            <h2>📰 Fil d'Actualité - Vos amis</h2>
            <Link to="/parcourir-profils" className="browse-profiles-btn">
              👥 Parcourir les profils
            </Link>
          </div>
          
          {loadingFeed ? (
            <div className="loading">Chargement du fil d'actualité...</div>
          ) : feed.length === 0 ? (
            <div className="empty-state">
              <p>📭 Aucune activité pour le moment.</p>
              <p>Suivez des utilisateurs pour voir leurs reviews dans votre fil d'actualité !</p>
            </div>
          ) : (
            <div className="feed-list">
              {feed.map(item => (
                <div key={item.id} className="feed-item">
                  <div className="feed-header">
                    <div className="feed-user">
                      <strong>{item.user.pseudo}</strong>
                      {item.user.bio && (
                        <span className="feed-user-bio">{item.user.bio}</span>
                      )}
                    </div>
                    <div className="feed-date">
                      {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  <div className="feed-content">
                    <div className="feed-film-info">
                      {item.film.afficheUrl && (
                        <img src={item.film.afficheUrl} alt={item.film.titre} className="feed-film-poster" />
                      )}
                      <div className="feed-film-details">
                        <h3>{item.film.titre}</h3>
                        {item.film.dateSortie && (
                          <p className="feed-film-year">{new Date(item.film.dateSortie).getFullYear()}</p>
                        )}
                      </div>
                    </div>
                    
                    {item.review.note && (
                      <div className="feed-rating">
                        <span className="rating-label">Note:</span>
                        <StarRating value={item.review.note} readonly={true} maxStars={5} />
                        <span className="rating-value">{item.review.note}/5</span>
                      </div>
                    )}
                    
                    {item.review.commentaire && (
                      <div className="feed-comment">
                        "{item.review.commentaire}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vue pour utilisateur non connecté
  return (
    <div className="home-page">
      <div className="home-container">
        <div className="hero-section">
          <h1>🎬 CinéConnect</h1>
          <p className="hero-subtitle">La communauté cinéphile qui partage sa passion</p>
          <p className="hero-description">
            Découvrez les derniers films, partagez vos avis et connectez-vous avec d'autres passionnés de cinéma
          </p>
          <button 
            onClick={() => setShowAuthModal(true)} 
            className="cta-button"
          >
            Rejoindre la communauté
          </button>
        </div>

        {/* Films les mieux notés */}
        {topRatedFilms.length > 0 && (
          <div className="featured-films-section">
            <h2>⭐ Films les mieux notés</h2>
            <div className="featured-films-grid">
              {topRatedFilms.map(film => (
                <Link key={film.id} to={`/films/${film.id}`} className="featured-film-card">
                  {film.afficheUrl && (
                    <img src={film.afficheUrl} alt={film.titre} className="featured-film-poster" />
                  )}
                  <div className="featured-film-info">
                    <h4>{film.titre}</h4>
                    {film.dateSortie && (
                      <p className="featured-film-year">{new Date(film.dateSortie).getFullYear()}</p>
                    )}
                    <div className="featured-film-rating">
                      <StarRating value={Math.round(film.noteMoyenne)} readonly={true} maxStars={5} />
                      <span className="rating-value">{film.noteMoyenne.toFixed(1)}/5</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Films les plus récents */}
        {recentFilms.length > 0 && (
          <div className="featured-films-section">
            <h2>🆕 Films les plus récents</h2>
            <div className="featured-films-grid">
              {recentFilms.map(film => (
                <Link key={film.id} to={`/recherche-films?filmId=${film.id}`} className="featured-film-card">
                  {film.afficheUrl && (
                    <img src={film.afficheUrl} alt={film.titre} className="featured-film-poster" />
                  )}
                  <div className="featured-film-info">
                    <h4>{film.titre}</h4>
                    {film.dateSortie && (
                      <p className="featured-film-year">{new Date(film.dateSortie).getFullYear()}</p>
                    )}
                    {film.noteMoyenne > 0 && (
                      <div className="featured-film-rating">
                        <StarRating value={Math.round(film.noteMoyenne)} readonly={true} maxStars={5} />
                        <span className="rating-value">{film.noteMoyenne.toFixed(1)}/5</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Fil d'actualité global */}
        <div className="feed-section">
          <h2>📰 Fil d'Actualité Global</h2>
          {loadingFeed ? (
            <div className="loading">Chargement du fil d'actualité...</div>
          ) : feed.length === 0 ? (
            <div className="empty-state">
              <p>📭 Aucune activité pour le moment.</p>
              <p>Rejoignez la communauté pour commencer à partager vos avis !</p>
            </div>
          ) : (
            <div className="feed-list">
              {feed.map(item => (
                <div key={item.id} className="feed-item">
                  <div className="feed-header">
                    <div className="feed-user">
                      <strong>{item.user.pseudo}</strong>
                      {item.user.bio && (
                        <span className="feed-user-bio">{item.user.bio}</span>
                      )}
                    </div>
                    <div className="feed-date">
                      {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  <div className="feed-content">
                    <div className="feed-film-info">
                      {item.film.afficheUrl && (
                        <img src={item.film.afficheUrl} alt={item.film.titre} className="feed-film-poster" />
                      )}
                      <div className="feed-film-details">
                        <h3>{item.film.titre}</h3>
                        {item.film.dateSortie && (
                          <p className="feed-film-year">{new Date(item.film.dateSortie).getFullYear()}</p>
                        )}
                      </div>
                    </div>
                    
                    {item.review.note && (
                      <div className="feed-rating">
                        <span className="rating-label">Note:</span>
                        <StarRating value={item.review.note} readonly={true} maxStars={5} />
                        <span className="rating-value">{item.review.note}/5</span>
                      </div>
                    )}
                    
                    {item.review.commentaire && (
                      <div className="feed-comment">
                        "{item.review.commentaire}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section Films */}
        <div className="movies-section">
          <h2>🎥 Derniers Films</h2>
          {loadingFilms ? (
            <div className="loading">Chargement des films...</div>
          ) : films.length === 0 ? (
            <div className="empty-state">Aucun film disponible</div>
          ) : (
            <div className="movies-grid">
              {films.slice(0, 6).map(film => (
                <div key={film.id} className="movie-card">
                  {film.afficheUrl && (
                    <img src={film.afficheUrl} alt={film.titre} className="movie-poster" />
                  )}
                  <div className="movie-info">
                    <h3>{film.titre}</h3>
                    {film.dateSortie && (
                      <p className="movie-date">{new Date(film.dateSortie).getFullYear()}</p>
                    )}
                    {film.noteUtilisateurs > 0 && (
                      <p className="movie-rating">
                        ⭐ {film.noteUtilisateurs.toFixed(1)}/5 ({film.nombreReviews} avis)
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal d'authentification */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default HomePage;
