/**
 * Page de détails d'un groupe
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getGroupDetails, joinGroup, leaveGroup, inviteToGroup, addFilmToGroup } from '../services/groupService';
import { getLatestMovies } from '../services/movieService';
import { createGroupMessage } from '../services/groupMessageService';
import { getCurrentUser, isAuthenticated } from '../services/authService';
import { reportContent } from '../services/moderationService';
import useGroupMessages from '../hooks/useGroupMessages';
import './GroupDetailsPage.css';

function GroupDetailsPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showAddFilmForm, setShowAddFilmForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [films, setFilms] = useState([]);
  const [selectedFilmId, setSelectedFilmId] = useState('');
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const currentUser = getCurrentUser();

  // Utiliser le hook WebSocket pour les messages en temps réel
  const { messages, loading: messagesLoading } = useGroupMessages(
    group && group.groupe.userRole ? groupId : null
  );

  useEffect(() => {
    loadGroup();
    loadFilms();
  }, [groupId]);

  // Scroll automatique vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadGroup = async () => {
    setLoading(true);
    try {
      const data = await getGroupDetails(groupId);
      setGroup(data);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement du groupe');
    } finally {
      setLoading(false);
    }
  };

  const loadFilms = async () => {
    try {
      const data = await getLatestMovies();
      setFilms(data.films || []);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    setError('');
    
    try {
      await createGroupMessage(groupId, newMessage.trim());
      setNewMessage('');
      // Le WebSocket va automatiquement ajouter le nouveau message via l'événement 'new-message'
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'envoi du message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleJoin = async () => {
    try {
      await joinGroup(groupId);
      loadGroup();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  const handleLeave = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir quitter ce groupe ?')) {
      try {
        await leaveGroup(groupId);
        navigate('/groupes');
      } catch (err) {
        setError(err.response?.data?.error || 'Erreur');
      }
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await inviteToGroup(groupId, inviteEmail);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  const handleAddFilm = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await addFilmToGroup(groupId, parseInt(selectedFilmId));
      setSelectedFilmId('');
      setShowAddFilmForm(false);
      loadGroup();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  const handleReportMessage = async (messageId) => {
    if (!isAuthenticated()) {
      setError('Vous devez être connecté pour signaler un message');
      return;
    }

    const reason = prompt('Raison du signalement (optionnel):');
    if (reason === null) return; // Annulé

    try {
      await reportContent('group_message', messageId, reason);
      alert('Message signalé avec succès');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du signalement');
    }
  };

  if (loading) {
    return <div className="group-details-page"><div className="loading">Chargement...</div></div>;
  }

  if (!group) {
    return <div className="group-details-page"><div className="error">Groupe non trouvé</div></div>;
  }

  const canManage = group.groupe.userRole && ['admin', 'moderateur'].includes(group.groupe.userRole);

  return (
    <div className="group-details-page">
      <div className="group-details-container">
        <button onClick={() => navigate('/groupes')} className="back-button">← Retour aux groupes</button>
        <div className="group-header">
          <div>
            <h1>{group.groupe.titre}</h1>
            {group.groupe.description && <p className="group-description">{group.groupe.description}</p>}
            {group.groupe.thematique && <span className="group-theme">{group.groupe.thematique}</span>}
          </div>
          <div className="group-actions">
            {!group.groupe.userRole ? (
              <button onClick={handleJoin} className="action-btn join-btn">Rejoindre</button>
            ) : (
              <>
                {canManage && (
                  <>
                    <button onClick={() => setShowInviteForm(!showInviteForm)} className="action-btn">
                      Inviter
                    </button>
                    <button onClick={() => setShowAddFilmForm(!showAddFilmForm)} className="action-btn">
                      Ajouter un film
                    </button>
                  </>
                )}
                <button onClick={handleLeave} className="action-btn leave-btn">Quitter</button>
              </>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {showInviteForm && (
          <form onSubmit={handleInvite} className="invite-form">
            <h3>Inviter un membre</h3>
            <input
              type="text"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email de l'utilisateur"
              required
            />
            <div className="form-actions">
              <button type="submit" className="submit-button">Inviter</button>
              <button type="button" onClick={() => setShowInviteForm(false)}>Annuler</button>
            </div>
          </form>
        )}

        {showAddFilmForm && (
          <form onSubmit={handleAddFilm} className="add-film-form">
            <h3>Ajouter un film au groupe</h3>
            <select
              value={selectedFilmId}
              onChange={(e) => setSelectedFilmId(e.target.value)}
              required
            >
              <option value="">Sélectionner un film</option>
              {films.map(film => (
                <option key={film.id} value={film.id}>{film.titre}</option>
              ))}
            </select>
            <div className="form-actions">
              <button type="submit" className="submit-button">Ajouter</button>
              <button type="button" onClick={() => setShowAddFilmForm(false)}>Annuler</button>
            </div>
          </form>
        )}

        {/* Section Discussion */}
        {group.groupe.userRole && (
          <div className="group-discussion-section">
            <h2>💬 Discussion du groupe</h2>
            <div className="messages-container">
              {messagesLoading ? (
                <div className="no-messages">
                  <p>Chargement des messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="no-messages">
                  <p>Aucun message pour le moment. Soyez le premier à écrire !</p>
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map(msg => {
                    const isOwnMessage = currentUser && msg.user.id === currentUser.id;
                    return (
                      <div key={msg.id} className={`message-item ${isOwnMessage ? 'own-message' : ''}`}>
                        <div className="message-avatar">
                          {msg.user.photoUrl ? (
                            <img src={msg.user.photoUrl} alt={msg.user.pseudo} />
                          ) : (
                            <div className="message-avatar-placeholder">
                              {msg.user.pseudo.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="message-content">
                          <div className="message-header">
                            <span className="message-author">{msg.user.pseudo}</span>
                            {isOwnMessage && <span className="message-you">(Vous)</span>}
                            <span className="message-time">
                              {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {!isOwnMessage && (
                              <button
                                onClick={() => handleReportMessage(msg.id)}
                                className="report-message-btn"
                                title="Signaler ce message"
                              >
                                🚩
                              </button>
                            )}
                          </div>
                          <div className="message-text">{msg.message}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            <form onSubmit={handleSendMessage} className="message-form">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Écrivez un message..."
                className="message-input"
                disabled={sendingMessage}
              />
              <button 
                type="submit" 
                className="send-message-btn"
                disabled={!newMessage.trim() || sendingMessage}
              >
                {sendingMessage ? 'Envoi...' : 'Envoyer'}
              </button>
            </form>
          </div>
        )}

        <div className="group-content">
          <div className="group-section">
            <h2>Membres ({group.membres ? group.membres.length : 0})</h2>
            {!group.membres || group.membres.length === 0 ? (
              <p className="empty-message">Aucun membre dans ce groupe</p>
            ) : (
              <div className="members-list">
                {group.membres.map(member => (
                  <div key={member.id} className="member-card" onClick={() => navigate(`/profil/${member.id}`)}>
                    <div className="member-avatar">
                      {member.photoUrl ? (
                        <img src={member.photoUrl} alt={member.pseudo} className="member-photo" />
                      ) : (
                        <div className="member-photo-placeholder">
                          {member.pseudo.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="member-info">
                      <div className="member-name">{member.pseudo}</div>
                      <div className={`member-role-badge member-role-${member.role}`}>
                        {member.role === 'admin' && '👑 Admin'}
                        {member.role === 'moderateur' && '🛡️ Modérateur'}
                        {member.role === 'membre' && '👤 Membre'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="group-section">
            <h2>Films ({group.films.length})</h2>
            {group.films.length === 0 ? (
              <p className="empty-message">Aucun film dans ce groupe</p>
            ) : (
              <div className="films-list">
                {group.films.map(film => (
                  <div key={film.id} className="film-card" onClick={() => navigate(`/films/${film.id}`)}>
                    {film.afficheUrl && (
                      <img src={film.afficheUrl} alt={film.titre} className="film-poster" />
                    )}
                    <div className="film-info">
                      <h4>{film.titre}</h4>
                      {film.dateSortie && <p>{new Date(film.dateSortie).getFullYear()}</p>}
                      <p className="added-by">Ajouté par {film.ajoutePar}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GroupDetailsPage;

