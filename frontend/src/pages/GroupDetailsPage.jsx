/**
 * Page de détails d'un groupe
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getGroupDetails, joinGroup, leaveGroup, inviteToGroup, addFilmToGroup, getGroupEvents, createEvent, joinEvent, leaveEvent, deleteEvent } from '../services/groupService';
import { getLatestMovies, searchMovies } from '../services/movieService';
import { createGroupMessage } from '../services/groupMessageService';
import { getCurrentUser, isAuthenticated } from '../services/authService';
import { reportContent } from '../services/moderationService';
import { getFriends } from '../services/friendService';
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
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const [films, setFilms] = useState([]);
  const [selectedFilmId, setSelectedFilmId] = useState('');
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const currentUser = getCurrentUser();

  // États pour les événements
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({
    titre: '',
    description: '',
    filmId: '',
    typeEvenement: 'projection',
    dateEvenement: '',
    lieu: '',
    nombreParticipantsMax: ''
  });
  
  // États pour la recherche de films dans le formulaire d'événement
  const [eventFilmSearch, setEventFilmSearch] = useState('');
  const [eventFilmResults, setEventFilmResults] = useState([]);
  const [searchingFilms, setSearchingFilms] = useState(false);
  const [selectedEventFilm, setSelectedEventFilm] = useState(null);

  // Utiliser le hook WebSocket pour les messages en temps réel
  const { messages, loading: messagesLoading } = useGroupMessages(
    group && group.groupe.userRole ? groupId : null
  );

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

  // Recherche de films pour le formulaire d'événement
  useEffect(() => {
    const searchEventFilms = async () => {
      if (!eventFilmSearch.trim() || eventFilmSearch.length < 2) {
        setEventFilmResults([]);
        return;
      }

      setSearchingFilms(true);
      try {
        const data = await searchMovies(eventFilmSearch.trim());
        setEventFilmResults(data.films || []);
      } catch (err) {
        console.error('Erreur lors de la recherche de films:', err);
        setEventFilmResults([]);
      } finally {
        setSearchingFilms(false);
      }
    };

    const timeoutId = setTimeout(searchEventFilms, 300);
    return () => clearTimeout(timeoutId);
  }, [eventFilmSearch]);

  const loadEvents = useCallback(async () => {
    if (!groupId) return;
    setLoadingEvents(true);
    try {
      const data = await getGroupEvents(groupId);
      setEvents(data.evenements || []);
    } catch (err) {
      console.error('Erreur lors du chargement des événements:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroup();
    loadFilms();
  }, [groupId]);

  useEffect(() => {
    if (group?.groupe?.userRole) {
      loadEvents();
    }
  }, [group, loadEvents]);

  // Scroll automatique vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const eventData = {
        ...eventForm,
        filmId: selectedEventFilm ? (selectedEventFilm.id || selectedEventFilm.tmdbId) : null,
        nombreParticipantsMax: eventForm.nombreParticipantsMax ? parseInt(eventForm.nombreParticipantsMax) : null
      };
      await createEvent(groupId, eventData);
      setEventForm({
        titre: '',
        description: '',
        filmId: '',
        typeEvenement: 'projection',
        dateEvenement: '',
        lieu: '',
        nombreParticipantsMax: ''
      });
      setEventFilmSearch('');
      setEventFilmResults([]);
      setSelectedEventFilm(null);
      setShowEventForm(false);
      loadEvents();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création de l\'événement');
    }
  };

  const handleSelectEventFilm = (film) => {
    setSelectedEventFilm(film);
    setEventFilmSearch(film.titre);
    setEventFilmResults([]);
  };

  const handleJoinEvent = async (eventId) => {
    try {
      await joinEvent(eventId);
      loadEvents();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  const handleLeaveEvent = async (eventId) => {
    try {
      await leaveEvent(eventId);
      loadEvents();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      return;
    }
    try {
      await deleteEvent(eventId);
      loadEvents();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const data = await getFriends();
      setFriends(data.friends || []);
      setFriendsLoaded(true);
    } catch (err) {
      console.error('Erreur lors du chargement des amis:', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const toggleInviteForm = () => {
    const next = !showInviteForm;
    setShowInviteForm(next);
    if (next && !friendsLoaded && !loadingFriends) {
      loadFriends();
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
      const friendId = selectedFriendId ? parseInt(selectedFriendId, 10) : null;

      if (!friendId) {
        setError('Sélectionnez un ami');
        return;
      }

      await inviteToGroup(groupId, friendId);
      // Message de succès
      alert('L\'invitation est bien partie !');
      setInviteEmail('');
      setSelectedFriendId('');
      setShowInviteForm(false);
    } catch (err) {
      const errorCode = err.response?.data?.error || '';
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Erreur';
      
      // Si l'utilisateur est déjà invité, afficher le message spécifique
      if (err.response?.status === 409 && (errorCode === 'Déjà invité' || errorMessage.includes('invitation'))) {
        alert('Déjà invité');
      } else {
        setError(errorMessage);
      }
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

  const canInvite = !!group.groupe.userRole; // tout membre peut inviter

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
                {canInvite && (
                  <>
                    <button onClick={toggleInviteForm} className="action-btn">
                      Inviter
                    </button>
                    <button onClick={() => setShowAddFilmForm(!showAddFilmForm)} className="action-btn">
                      Ajouter un film
                    </button>
                    <button onClick={() => setShowEventForm(!showEventForm)} className="action-btn">
                      📅 Créer un événement
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
            <label>
              Sélectionner un ami
              <select
                value={selectedFriendId}
                onChange={(e) => setSelectedFriendId(e.target.value)}
                disabled={loadingFriends}
                required
              >
                <option value="">-- Choisir --</option>
                {friends.map(friend => (
                  <option key={friend.id} value={friend.id}>{friend.pseudo}</option>
                ))}
              </select>
            </label>
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

        {showEventForm && (
          <form onSubmit={handleCreateEvent} className="add-film-form">
            <h3>🎬 Créer un événement cinéma</h3>
            <label>
              Titre *
              <input
                type="text"
                value={eventForm.titre}
                onChange={(e) => setEventForm({ ...eventForm, titre: e.target.value })}
                required
                placeholder="Ex: Avant-première de Dune"
              />
            </label>
            <label>
              Description
              <textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Description de l'événement..."
                rows="3"
              />
            </label>
            <label>
              Film (optionnel)
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={eventFilmSearch}
                  onChange={(e) => {
                    setEventFilmSearch(e.target.value);
                    if (!e.target.value.trim()) {
                      setSelectedEventFilm(null);
                      setEventForm({ ...eventForm, filmId: '' });
                    }
                  }}
                  placeholder="Rechercher un film (DB + TMDB)..."
                  style={{ width: '100%', marginBottom: 0 }}
                />
                {selectedEventFilm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEventFilm(null);
                      setEventFilmSearch('');
                      setEventForm({ ...eventForm, filmId: '' });
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem'
                    }}
                    title="Effacer la sélection"
                  >
                    ×
                  </button>
                )}
                {eventFilmResults.length > 0 && !selectedEventFilm && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    marginTop: '4px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }}>
                    {eventFilmResults.map(film => (
                      <div
                        key={film.id || film.tmdbId}
                        onClick={() => handleSelectEventFilm(film)}
                        style={{
                          padding: '0.75rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
                        onMouseLeave={(e) => e.target.style.background = 'var(--bg-card)'}
                      >
                        {film.afficheUrl && (
                          <img
                            src={film.afficheUrl}
                            alt={film.titre}
                            style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{film.titre}</div>
                          {film.dateSortie && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {new Date(film.dateSortie).getFullYear()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {searchingFilms && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    padding: '0.75rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    marginTop: '4px',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)'
                  }}>
                    Recherche en cours...
                  </div>
                )}
              </div>
              {selectedEventFilm && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)'
                }}>
                  Film sélectionné : <strong>{selectedEventFilm.titre}</strong>
                  {selectedEventFilm.dateSortie && ` (${new Date(selectedEventFilm.dateSortie).getFullYear()})`}
                </div>
              )}
            </label>
            <label>
              Type d'événement
              <select
                value={eventForm.typeEvenement}
                onChange={(e) => setEventForm({ ...eventForm, typeEvenement: e.target.value })}
              >
                <option value="projection">Projection</option>
                <option value="avant_premiere">Avant-première</option>
                <option value="festival">Festival</option>
                <option value="autre">Autre</option>
              </select>
            </label>
            <label>
              Date et heure *
              <input
                type="datetime-local"
                value={eventForm.dateEvenement}
                onChange={(e) => setEventForm({ ...eventForm, dateEvenement: e.target.value })}
                required
              />
            </label>
            <label>
              Lieu
              <input
                type="text"
                value={eventForm.lieu}
                onChange={(e) => setEventForm({ ...eventForm, lieu: e.target.value })}
                placeholder="Ex: Cinéma Le Grand Rex, Paris"
              />
            </label>
            <label>
              Nombre max de participants (optionnel)
              <input
                type="number"
                value={eventForm.nombreParticipantsMax}
                onChange={(e) => setEventForm({ ...eventForm, nombreParticipantsMax: e.target.value })}
                min="1"
                placeholder="Illimité si vide"
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="submit-button">Créer l'événement</button>
              <button type="button" onClick={() => setShowEventForm(false)}>Annuler</button>
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

          {/* Section Agenda des Événements */}
          {group.groupe.userRole && (
            <div className="group-section">
              <h2>📅 Agenda partagé des évènements liés aux groupes</h2>
              {loadingEvents ? (
                <p className="empty-message">Chargement des événements...</p>
              ) : events.length === 0 ? (
                <p className="empty-message">Aucun événement prévu</p>
              ) : (
                <div className="events-agenda">
                  <div className="agenda-events">
                    {events
                      .sort((a, b) => new Date(a.dateEvenement) - new Date(b.dateEvenement))
                      .map(event => (
                    <div key={event.id} className="event-card">
                      <div className="event-header">
                        <h3>{event.titre}</h3>
                        {currentUser && (event.createur.id === currentUser.id || group.groupe.userRole === 'admin' || group.groupe.userRole === 'moderateur') && (
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="delete-event-btn"
                            title="Supprimer l'événement"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                      <div className="event-type-badge">
                        {event.typeEvenement === 'avant_premiere' && '🎉 Avant-première'}
                        {event.typeEvenement === 'projection' && '🎬 Projection'}
                        {event.typeEvenement === 'festival' && '🎪 Festival'}
                        {event.typeEvenement === 'autre' && '📅 Autre'}
                      </div>
                      {event.film && (
                        <div className="event-film">
                          {event.film.afficheUrl && (
                            <img src={event.film.afficheUrl} alt={event.film.titre} className="event-film-poster" />
                          )}
                          <div className="event-film-info">
                            <strong>{event.film.titre}</strong>
                          </div>
                        </div>
                      )}
                      {event.description && (
                        <p className="event-description">{event.description}</p>
                      )}
                      <div className="event-details">
                        <div className="event-detail">
                          <strong>📅 Date :</strong> {new Date(event.dateEvenement).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="event-detail">
                          <strong>🕐 Heure :</strong> {new Date(event.dateEvenement).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        {event.lieu && (
                          <div className="event-detail">
                            <strong>📍 Lieu :</strong> {event.lieu}
                          </div>
                        )}
                        <div className="event-detail">
                          <strong>👥 Participants :</strong> {event.nombreParticipants}
                          {event.nombreParticipantsMax && ` / ${event.nombreParticipantsMax}`}
                        </div>
                        <div className="event-detail">
                          <strong>👤 Créé par :</strong> {event.createur.pseudo}
                        </div>
                      </div>
                      <div className="event-actions">
                        {event.userParticipates ? (
                          <button
                            onClick={() => handleLeaveEvent(event.id)}
                            className="event-action-btn leave-event-btn"
                          >
                            Se désinscrire
                          </button>
                        ) : (
                          <button
                            onClick={() => handleJoinEvent(event.id)}
                            className="event-action-btn join-event-btn"
                            disabled={event.nombreParticipantsMax && event.nombreParticipants >= event.nombreParticipantsMax}
                          >
                            {event.nombreParticipantsMax && event.nombreParticipants >= event.nombreParticipantsMax
                              ? 'Complet'
                              : 'Participer'}
                          </button>
                        )}
                      </div>
                    </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GroupDetailsPage;

