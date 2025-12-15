/**
 * Middleware d'authentification JWT
 * Vérifie la validité du token JWT dans les requêtes
 */

const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * Middleware pour vérifier le token JWT
 * Extrait et vérifie le token depuis l'en-tête Authorization
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({
        error: 'Token d\'authentification manquant',
        message: 'Vous devez être connecté pour accéder à cette ressource'
      });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Récupérer les informations de l'utilisateur depuis la base de données
    const [users] = await pool.execute(
      'SELECT id, email, pseudo, photo_url, bio, role, genres_preferences FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Utilisateur non trouvé',
        message: 'Le token est valide mais l\'utilisateur n\'existe plus'
      });
    }

    // Ajouter les informations de l'utilisateur à la requête
    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token invalide',
        message: 'Le token fourni n\'est pas valide'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expiré',
        message: 'Votre session a expiré, veuillez vous reconnecter'
      });
    }
    
    console.error('Erreur d\'authentification:', error);
    return res.status(500).json({
      error: 'Erreur d\'authentification',
      message: 'Une erreur est survenue lors de la vérification du token'
    });
  }
};

/**
 * Middleware optionnel pour vérifier les rôles
 * @param {...string} roles - Rôles autorisés
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Non authentifié',
        message: 'Vous devez être connecté'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous n\'avez pas les permissions nécessaires'
      });
    }

    next();
  };
};

/**
 * Middleware optionnel pour l'authentification
 * Ajoute les informations de l'utilisateur si un token est fourni, mais ne bloque pas si absent
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [users] = await pool.execute(
          'SELECT id, email, pseudo, photo_url, bio, role, genres_preferences FROM users WHERE id = ?',
          [decoded.userId]
        );

        if (users.length > 0) {
          req.user = users[0];
        }
      } catch (error) {
        // Si le token est invalide, on continue sans authentification
        req.user = null;
      }
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    // En cas d'erreur, on continue sans authentification
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  authorize,
  optionalAuth
};

