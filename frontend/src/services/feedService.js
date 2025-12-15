/**
 * Service pour le fil d'actualité
 */

import api from './api';

// Fil d'actualité global (pour utilisateurs non connectés)
export const getGlobalFeed = async () => {
  const response = await api.get('/feed/global');
  return response.data;
};

// Fil d'actualité des amis (pour utilisateurs connectés)
export const getFeed = async () => {
  const response = await api.get('/feed');
  return response.data;
};


