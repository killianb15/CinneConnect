/**
 * Service pour les messages de groupe (discussion)
 */

import api from './api';

/**
 * Récupère tous les messages d'un groupe
 * @param {number} groupId - ID du groupe
 * @returns {Promise<Object>} Liste des messages
 */
export const getGroupMessages = async (groupId) => {
  const response = await api.get(`/groups/${groupId}/messages`);
  return response.data;
};

/**
 * Crée un nouveau message dans un groupe
 * @param {number} groupId - ID du groupe
 * @param {string} message - Contenu du message
 * @returns {Promise<Object>} Message créé
 */
export const createGroupMessage = async (groupId, message) => {
  const response = await api.post(`/groups/${groupId}/messages`, { message });
  return response.data;
};

