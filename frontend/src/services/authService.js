/**
 * Service d'authentification
 * Gère l'inscription, la connexion et la récupération de mot de passe
 */

import api from './api';

/**
 * Inscription d'un nouvel utilisateur
 * @param {Object} userData - Données de l'utilisateur (email, password, pseudo)
 * @returns {Promise} Réponse de l'API avec le token et les données utilisateur
 */
export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  
  // Sauvegarder le token et les données utilisateur
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  
  return response.data;
};

/**
 * Connexion d'un utilisateur
 * @param {Object} credentials - Identifiants (email, password)
 * @returns {Promise} Réponse de l'API avec le token et les données utilisateur
 */
export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  
  // Sauvegarder le token et les données utilisateur
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  
  return response.data;
};

/**
 * Déconnexion de l'utilisateur
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Vérifie si l'utilisateur est connecté
 * @returns {boolean} True si un token existe
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

/**
 * Récupère les données de l'utilisateur depuis le localStorage
 * @returns {Object|null} Données de l'utilisateur ou null
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * Vérifie le token avec le serveur
 * @returns {Promise} Réponse de l'API avec les données utilisateur
 */
export const verifyToken = async () => {
  const response = await api.get('/auth/verify');
  return response.data;
};

/**
 * Demande de réinitialisation de mot de passe
 * @param {string} email - Email de l'utilisateur
 * @returns {Promise} Réponse de l'API
 */
export const requestPasswordReset = async (email) => {
  const response = await api.post('/auth/password-reset-request', { email });
  return response.data;
};

/**
 * Réinitialise le mot de passe avec le token
 * @param {Object} data - Token et nouveau mot de passe
 * @returns {Promise} Réponse de l'API
 */
export const resetPassword = async (data) => {
  const response = await api.post('/auth/password-reset', data);
  return response.data;
};

