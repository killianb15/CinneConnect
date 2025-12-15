/**
 * Service pour les utilisateurs et profils
 */

import api from './api';

export const getUserProfile = async (userId) => {
  const response = await api.get(`/users/${userId}/profile`);
  return response.data;
};

export const updateProfile = async (profileData) => {
  const response = await api.put('/users/me', profileData);
  return response.data;
};

export const getUserGroups = async (userId) => {
  const response = await api.get(`/users/${userId}/groups`);
  return response.data;
};

export const addFavoriteFilm = async (filmId) => {
  const response = await api.post(`/users/favorites/${filmId}`);
  return response.data;
};

export const removeFavoriteFilm = async (filmId) => {
  const response = await api.delete(`/users/favorites/${filmId}`);
  return response.data;
};

/**
 * Suit un utilisateur
 * @param {number} userId - ID de l'utilisateur à suivre
 * @returns {Promise<Object>} Résultat de l'opération
 */
export const followUser = async (userId) => {
  const response = await api.post(`/users/${userId}/follow`);
  return response.data;
};

/**
 * Ne suit plus un utilisateur
 * @param {number} userId - ID de l'utilisateur à ne plus suivre
 * @returns {Promise<Object>} Résultat de l'opération
 */
export const unfollowUser = async (userId) => {
  const response = await api.delete(`/users/${userId}/follow`);
  return response.data;
};

