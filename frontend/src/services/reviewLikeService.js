/**
 * Service pour la gestion des likes sur les reviews
 */

import api from './api';

/**
 * Like ou unlike une review
 */
export const toggleLike = async (reviewId) => {
  const response = await api.post(`/reviews/${reviewId}/like`);
  return response.data;
};

/**
 * Récupère le statut de like pour une review
 */
export const getLikeStatus = async (reviewId) => {
  const response = await api.get(`/reviews/${reviewId}/like-status`);
  return response.data;
};

