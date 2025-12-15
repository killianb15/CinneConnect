/**
 * Page de détails d'un film
 * Affiche les informations du film, les reviews, permet de noter/commenter
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getMovieDetails } from '../services/movieService';
import { createOrUpdateReview } from '../services/reviewService';
import { toggleLike, getLikeStatus } from '../services/reviewLikeService';
import { createReply, getReplies } from '../services/commentReplyService';
import { reportContent } from '../services/moderationService';
import { getCurrentUser, isAuthenticated } from '../services/authService';
import StarRating from '../components/StarRating';
import './FilmDetailsPage.css';

function FilmDetailsPage() {
  const { filmId } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const isLoggedIn = isAuthenticated();

  const [film, setFilm] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // État pour le formulaire de review
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({
    note: 0,
    commentaire: ''
  });

  // État pour les likes et réponses
  const [likesStatus, setLikesStatus] = useState({});
  const [replies, setReplies] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [replyTexts, setReplyTexts] = useState({});

  useEffect(() => {
    loadFilmDetails();
  }, [filmId]);

  const loadFilmDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMovieDetails(filmId);
      setFilm(data.film);
      setReviews(data.reviews || []);

      // Charger les statuts de likes pour toutes les reviews
      if (isLoggedIn) {
        const likesPromises = data.reviews.map(review =>
          getLikeStatus(review.id).then(status => ({ reviewId: review.id, ...status }))
        );
        const likesResults = await Promise.all(likesPromises);
        const likesMap = {};
        likesResults.forEach(result => {
          likesMap[result.reviewId] = { liked: result.liked, likesCount: result.likesCount };
        });
        setLikesStatus(likesMap);

        // Charger les réponses pour toutes les reviews
        const repliesPromises = data.reviews.map(review =>
          getReplies(review.id).then(data => ({ reviewId: review.id, replies: data.replies }))
        );
        const repliesResults = await Promise.all(repliesPromises);
        const repliesMap = {};
        repliesResults.forEach(result => {
          repliesMap[result.reviewId] = result.replies;
        });
        setReplies(repliesMap);
      }
    } catch (err) {
      console.error('Erreur lors du chargement du film:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement du film');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setError('Vous devez être connecté pour noter un film');
      return;
    }

    try {
      await createOrUpdateReview(filmId, {
        note: reviewData.note,
        commentaire: reviewData.commentaire
      });
      setReviewData({ note: 0, commentaire: '' });
      setShowReviewForm(false);
      await loadFilmDetails(); // Recharger les détails
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement de la review');
    }
  };

  const handleLike = async (reviewId) => {
    if (!isLoggedIn) {
      setError('Vous devez être connecté pour liker une review');
      return;
    }

    try {
      const result = await toggleLike(reviewId);
      setLikesStatus(prev => ({
        ...prev,
        [reviewId]: { liked: result.liked, likesCount: result.likesCount }
      }));
    } catch (err) {
      console.error('Erreur lors du like:', err);
    }
  };

  const handleReplySubmit = async (reviewId) => {
    if (!isLoggedIn) {
      setError('Vous devez être connecté pour répondre');
      return;
    }

    const message = replyTexts[reviewId];
    if (!message || !message.trim()) {
      return;
    }

    try {
      await createReply(reviewId, message);
      setReplyTexts(prev => ({ ...prev, [reviewId]: '' }));
      // Recharger les réponses
      const data = await getReplies(reviewId);
      setReplies(prev => ({ ...prev, [reviewId]: data.replies }));
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'envoi de la réponse');
    }
  };

  const handleReport = async (contentType, contentId) => {
    if (!isLoggedIn) {
      setError('Vous devez être connecté pour signaler du contenu');
      return;
    }

    const reason = prompt('Raison du signalement (optionnel):');
    if (reason === null) return; // Annulé

    try {
      await reportContent(contentType, contentId, reason);
      alert('Contenu signalé avec succès');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du signalement');
    }
  };

  if (loading) {
    return (
      <div className="film-details-page">
        <div className="loading">Chargement du film...</div>
      </div>
    );
  }

  if (!film) {
    return (
      <div className="film-details-page">
        <div className="error">Film non trouvé</div>
        <button onClick={() => navigate(-1)} className="back-button">← Retour</button>
      </div>
    );
  }

  return (
    <div className="film-details-page">
      <div className="film-details-container">
        <button onClick={() => navigate(-1)} className="back-button">← Retour</button>

        {/* En-tête du film */}
        <div className="film-header">
          {film.afficheUrl && (
            <img src={film.afficheUrl} alt={film.titre} className="film-poster-large" />
          )}
          <div className="film-info">
            <h1>{film.titre}</h1>
            {film.titreOriginal && film.titreOriginal !== film.titre && (
              <p className="film-original-title">{film.titreOriginal}</p>
            )}
            {film.dateSortie && (
              <p className="film-year">{new Date(film.dateSortie).getFullYear()}</p>
            )}
            {film.realisateur && (
              <p className="film-director">Réalisateur : {film.realisateur}</p>
            )}
            {film.duree && (
              <p className="film-duration">Durée : {film.duree} min</p>
            )}
            {film.genres && film.genres.length > 0 && (
              <div className="film-genres">
                {film.genres.map((genre, idx) => (
                  <span key={idx} className="genre-tag">{genre}</span>
                ))}
              </div>
            )}
            {film.noteMoyenne > 0 && (
              <div className="film-rating">
                <StarRating value={Math.round(film.noteMoyenne)} readonly={true} maxStars={5} />
                <span className="rating-value">{film.noteMoyenne.toFixed(1)}/5</span>
                <span className="rating-count">({film.nombreVotes} vote{film.nombreVotes > 1 ? 's' : ''})</span>
              </div>
            )}
          </div>
        </div>

        {/* Synopsis */}
        {film.synopsis && (
          <div className="film-synopsis">
            <h2>Synopsis</h2>
            <p>{film.synopsis}</p>
          </div>
        )}

        {/* Casting */}
        {film.casting && film.casting.length > 0 && (
          <div className="film-casting">
            <h2>Casting</h2>
            <div className="casting-list">
              {film.casting.map((actor, idx) => (
                <span key={idx} className="actor-tag">{actor}</span>
              ))}
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {/* Formulaire de review */}
        {isLoggedIn && (
          <div className="review-section">
            <h2>Votre avis</h2>
            {!showReviewForm ? (
              <button onClick={() => setShowReviewForm(true)} className="add-review-btn">
                Noter et commenter ce film
              </button>
            ) : (
              <form onSubmit={handleReviewSubmit} className="review-form">
                <div className="form-group">
                  <label>Note (1-5 étoiles)</label>
                  <StarRating
                    value={reviewData.note}
                    onChange={(value) => setReviewData({ ...reviewData, note: value })}
                    maxStars={5}
                  />
                </div>
                <div className="form-group">
                  <label>Commentaire</label>
                  <textarea
                    value={reviewData.commentaire}
                    onChange={(e) => setReviewData({ ...reviewData, commentaire: e.target.value })}
                    placeholder="Partagez votre avis sur ce film..."
                    rows={4}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="submit-btn">Enregistrer</button>
                  <button type="button" onClick={() => {
                    setShowReviewForm(false);
                    setReviewData({ note: 0, commentaire: '' });
                  }} className="cancel-btn">Annuler</button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Liste des reviews */}
        <div className="reviews-section">
          <h2>Reviews ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <p className="empty-message">Aucune review pour le moment</p>
          ) : (
            <div className="reviews-list">
              {reviews.map(review => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    <div className="review-user">
                      {review.user.photoUrl && (
                        <img src={review.user.photoUrl} alt={review.user.pseudo} className="user-avatar" />
                      )}
                      <strong>{review.user.pseudo}</strong>
                    </div>
                    <div className="review-actions">
                      {isLoggedIn && (
                        <button
                          onClick={() => handleReport('review', review.id)}
                          className="report-btn"
                          title="Signaler"
                        >
                          🚩
                        </button>
                      )}
                    </div>
                  </div>
                  {review.note && (
                    <div className="review-rating">
                      <StarRating value={review.note} readonly={true} maxStars={5} />
                    </div>
                  )}
                  {review.commentaire && (
                    <p className="review-comment">{review.commentaire}</p>
                  )}
                  <div className="review-footer">
                    <div className="review-likes">
                      <button
                        onClick={() => handleLike(review.id)}
                        className={`like-btn ${likesStatus[review.id]?.liked ? 'liked' : ''}`}
                        disabled={!isLoggedIn}
                      >
                        {likesStatus[review.id]?.liked ? '❤️' : '🤍'} {likesStatus[review.id]?.likesCount || 0}
                      </button>
                    </div>
                    <button
                      onClick={() => setShowReplies(prev => ({ ...prev, [review.id]: !prev[review.id] }))}
                      className="reply-toggle-btn"
                    >
                      {showReplies[review.id] ? 'Masquer' : 'Voir'} les réponses ({replies[review.id]?.length || 0})
                    </button>
                  </div>

                  {/* Réponses */}
                  {showReplies[review.id] && (
                    <div className="replies-section">
                      {replies[review.id]?.map(reply => (
                        <div key={reply.id} className="reply-item">
                          <div className="reply-header">
                            <strong>{reply.user.pseudo}</strong>
                            {isLoggedIn && (
                              <button
                                onClick={() => handleReport('comment_reply', reply.id)}
                                className="report-btn-small"
                                title="Signaler"
                              >
                                🚩
                              </button>
                            )}
                          </div>
                          <p className="reply-message">{reply.message}</p>
                        </div>
                      ))}
                      {isLoggedIn && (
                        <div className="reply-form">
                          <textarea
                            value={replyTexts[review.id] || ''}
                            onChange={(e) => setReplyTexts(prev => ({ ...prev, [review.id]: e.target.value }))}
                            placeholder="Répondre..."
                            rows={2}
                          />
                          <button
                            onClick={() => handleReplySubmit(review.id)}
                            className="reply-submit-btn"
                          >
                            Répondre
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FilmDetailsPage;

