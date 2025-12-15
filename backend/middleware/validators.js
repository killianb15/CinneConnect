/**
 * Validateurs pour les routes d'authentification
 * Validations désactivées pour le développement
 */

const { body } = require('express-validator');

/**
 * Validateurs pour l'inscription - Aucune validation
 */
const validateRegister = [
  // Pas de validation pour le développement
];

/**
 * Validateurs pour la connexion - Aucune validation
 */
const validateLogin = [
  // Pas de validation pour le développement
];

/**
 * Validateurs pour la demande de réinitialisation - Aucune validation
 */
const validatePasswordResetRequest = [
  // Pas de validation pour le développement
];

/**
 * Validateurs pour la réinitialisation du mot de passe - Aucune validation
 */
const validatePasswordReset = [
  // Pas de validation pour le développement
];

module.exports = {
  validateRegister,
  validateLogin,
  validatePasswordResetRequest,
  validatePasswordReset
};
