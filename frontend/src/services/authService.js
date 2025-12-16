/**
 * Service d'authentification
 * Ici je centralise toutes les actions liées au login/register/logout et OAuth Google
 */

import api from './api';

/**
 * Stocker token + user dans le localStorage
 */
function enregistrerSession(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Nettoyer la session
 */
function supprimerSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

/**
 * Récupérer l'utilisateur courant depuis le localStorage
 */
export const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch (e) {
        return null;
    }
};

/**
 * Savoir si l'utilisateur est authentifié (présence d'un token)
 */
export const isAuthenticated = () => {
    return Boolean(localStorage.getItem('token'));
};

/**
 * Connexion classique
 * @param {{email: string, password: string}} data
 */
export const login = async (data) => {
    const response = await api.post('/auth/login', data);

    if (response.data?.token) {
        enregistrerSession(response.data.token, response.data.user);
    }

    return response.data;
};

/**
 * Inscription classique
 * @param {{email: string, password: string, pseudo: string}} data
 */
export const register = async (data) => {
    const response = await api.post('/auth/register', data);

    if (response.data?.token) {
        enregistrerSession(response.data.token, response.data.user);
    }

    return response.data;
};

/**
 * Déconnexion (front uniquement)
 */
export const logout = () => {
    supprimerSession();
};

/**
 * Vérifier la validité du token (si votre backend expose /auth/verify)
 */
export const verify = async () => {
    const response = await api.get('/auth/verify');
    return response.data;
};

/**
 * Demander une réinitialisation de mot de passe
 * Attention : adaptez l'URL si votre backend utilise un autre endpoint
 * @param {{email: string}} data
 */
export const requestPasswordReset = async (data) => {
    const response = await api.post('/auth/password-forgot', data);
    return response.data;
};

/**
 * Réinitialiser le mot de passe avec token
 * Attention : adaptez l'URL si votre backend utilise un autre endpoint
 * @param {{token: string, password: string}} data
 */
export const resetPassword = async (data) => {
    const response = await api.post('/auth/password-reset', data);
    return response.data;
};

/**
 * Connexion via Google (ID token)
 * Le frontend reçoit credential (ID token) et l'envoie au backend.
 * Le backend vérifie Google, puis renvoie votre JWT + user.
 * @param {string} credential
 */
export const loginWithGoogle = async (credential) => {
    const response = await api.post('/auth/oauth/google', { credential });

    if (response.data?.token) {
        enregistrerSession(response.data.token, response.data.user);
    }

    return response.data;
};
