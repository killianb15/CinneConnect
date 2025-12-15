/**
 * Service pour la gestion des réponses aux commentaires
 */

import api from './api';

/**
 * Crée une réponse à un commentaire
 */
export const createReply = async (reviewId, message) => {
  const response = await api.post(`/reviews/${reviewId}/replies`, { message });
  return response.data;
};

/**
 * Récupère les réponses d'un commentaire
 */
export const getReplies = async (reviewId) => {
  const response = await api.get(`/reviews/${reviewId}/replies`);
  return response.data;
};

/**
 * Supprime une réponse
 */
export const deleteReply = async (replyId) => {
  const response = await api.delete(`/replies/${replyId}`);
  return response.data;
};

