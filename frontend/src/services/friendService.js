/**
 * Service pour la gestion des demandes d'amis et des relations d'amitié
 */

import api from './api';

/**
 * Parcourt les profils disponibles
 * @param {number} limit - Nombre de profils à récupérer
 * @param {number} offset - Décalage pour la pagination
 * @param {string} search - Terme de recherche pour filtrer par nom
 */
export const discoverProfiles = async (limit = 50, offset = 0, search = '') => {
  const params = { limit, offset };
  if (search && search.trim()) {
    params.search = search.trim();
  }
  const response = await api.get('/users/discover', { params });
  return response.data;
};

/**
 * Envoie une demande d'ami
 */
export const sendFriendRequest = async (userId) => {
  const response = await api.post(`/users/${userId}/friend-request`);
  return response.data;
};

/**
 * Accepte une demande d'ami
 */
export const acceptFriendRequest = async (userId) => {
  const response = await api.post(`/users/${userId}/friend-request/accept`);
  return response.data;
};

/**
 * Refuse une demande d'ami
 */
export const rejectFriendRequest = async (userId) => {
  const response = await api.post(`/users/${userId}/friend-request/reject`);
  return response.data;
};

/**
 * Récupère les demandes d'amis reçues en attente
 */
export const getFriendRequests = async () => {
  const response = await api.get('/users/friend-requests');
  return response.data;
};

/**
 * Récupère la liste des amis
 */
export const getFriends = async () => {
  const response = await api.get('/users/friends');
  return response.data;
};

