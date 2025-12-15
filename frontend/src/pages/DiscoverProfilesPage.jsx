/**
 * Page pour parcourir les profils et envoyer des demandes d'amis
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { discoverProfiles, sendFriendRequest } from '../services/friendService';
import { getCurrentUser } from '../services/authService';
import './DiscoverProfilesPage.css';

function DiscoverProfilesPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingRequests, setLoadingRequests] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Débounce pour la recherche
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadProfiles();
    }, 300); // Attendre 300ms après la dernière frappe

    return () => {
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const loadProfiles = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await discoverProfiles(50, 0, searchQuery);
      setProfiles(data.profiles || []);
    } catch (err) {
      console.error('Erreur lors du chargement des profils:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des profils');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId) => {
    setLoadingRequests(prev => ({ ...prev, [userId]: true }));
    try {
      await sendFriendRequest(userId);
      // Mettre à jour le statut du profil
      setProfiles(prevProfiles =>
        prevProfiles.map(profile =>
          profile.id === userId
            ? { ...profile, friendStatus: 'pending_sent' }
            : profile
        )
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'envoi de la demande');
    } finally {
      setLoadingRequests(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="discover-profiles-page">
        <div className="loading">Chargement des profils...</div>
      </div>
    );
  }

  return (
    <div className="discover-profiles-page">
      <div className="discover-container">
        <button onClick={() => navigate(-1)} className="back-button">← Retour</button>
        
        <div className="discover-header">
          <h1>👥 Parcourir les profils</h1>
          <p>Découvrez de nouveaux membres et ajoutez-les comme amis</p>
        </div>

        {/* Barre de recherche */}
        <div className="search-section">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Rechercher un profil par nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="clear-search-btn"
                aria-label="Effacer la recherche"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {profiles.length === 0 ? (
          <div className="empty-state">
            <p>
              {searchQuery 
                ? `📭 Aucun profil trouvé pour "${searchQuery}".` 
                : '📭 Aucun profil disponible pour le moment.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="clear-search-link"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <div className="profiles-grid">
            {profiles.map(profile => (
              <div key={profile.id} className="profile-card">
                <div className="profile-card-header">
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt={profile.pseudo} className="profile-card-photo" />
                  ) : (
                    <div className="profile-card-photo-placeholder">
                      {profile.pseudo.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="profile-card-info">
                    <h3>{profile.pseudo}</h3>
                    {profile.bio && <p className="profile-card-bio">{profile.bio}</p>}
                  </div>
                </div>

                <div className="profile-card-stats">
                  <div className="stat-item">
                    <strong>{profile.stats.nombreReviews}</strong>
                    <span>Reviews</span>
                  </div>
                  <div className="stat-item">
                    <strong>{profile.stats.nombreGroupes}</strong>
                    <span>Groupes</span>
                  </div>
                  <div className="stat-item">
                    <strong>{profile.stats.nombreFollowers}</strong>
                    <span>Abonnés</span>
                  </div>
                </div>

                <div className="profile-card-actions">
                  {profile.friendStatus === 'none' && (
                    <button
                      onClick={() => handleSendFriendRequest(profile.id)}
                      className="friend-request-btn"
                      disabled={loadingRequests[profile.id]}
                    >
                      {loadingRequests[profile.id] ? '...' : '➕ Demander en ami'}
                    </button>
                  )}
                  {profile.friendStatus === 'pending_sent' && (
                    <button className="friend-request-btn pending" disabled>
                      ⏳ Demande envoyée
                    </button>
                  )}
                  {profile.friendStatus === 'pending_received' && (
                    <Link
                      to={`/profil/${profile.id}`}
                      className="friend-request-btn received"
                    >
                      📬 Voir la demande
                    </Link>
                  )}
                  {profile.friendStatus === 'friend' && (
                    <button className="friend-request-btn friend" disabled>
                      ✅ Ami
                    </button>
                  )}
                  <Link
                    to={`/profil/${profile.id}`}
                    className="view-profile-btn"
                  >
                    Voir le profil
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DiscoverProfilesPage;

