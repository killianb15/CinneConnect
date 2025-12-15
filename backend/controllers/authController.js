/**
 * Contrôleur pour l'authentification
 * Gère l'inscription, la connexion et la récupération de mot de passe
 * Adapté pour MySQL/MariaDB
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * Inscription d'un nouvel utilisateur
 */
const register = async (req, res) => {
  try {
    const { email, password, pseudo } = req.body;

    // Vérifier que les champs de base sont présents
    if (!email || !password || !pseudo) {
      return res.status(400).json({
        error: 'Email, mot de passe et pseudo sont requis'
      });
    }

    // Vérifier si l'email existe déjà
    const [emailCheck] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (emailCheck.length > 0) {
      return res.status(409).json({
        error: 'Email déjà utilisé',
        message: 'Un compte existe déjà avec cet email'
      });
    }

    // Vérifier si le pseudo existe déjà
    const [pseudoCheck] = await pool.execute(
      'SELECT id FROM users WHERE pseudo = ?',
      [pseudo]
    );

    if (pseudoCheck.length > 0) {
      return res.status(409).json({
        error: 'Pseudo déjà utilisé',
        message: 'Ce pseudo est déjà pris, veuillez en choisir un autre'
      });
    }

    // Hasher le mot de passe
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur
    const [result] = await pool.execute(
      `INSERT INTO users (email, password_hash, pseudo) 
       VALUES (?, ?, ?)`,
      [email, passwordHash, pseudo]
    );

    // Récupérer l'utilisateur créé (MySQL ne supporte pas RETURNING)
    const [users] = await pool.execute(
      'SELECT id, email, pseudo, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    const user = users[0];

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Inscription réussie',
      token,
      user: {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de l\'inscription'
    });
  }
};

/**
 * Connexion d'un utilisateur
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier que les champs de base sont présents
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email et mot de passe sont requis'
      });
    }

    // Récupérer l'utilisateur
    const [users] = await pool.execute(
      'SELECT id, email, password_hash, pseudo, photo_url, bio, role, genres_preferences FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Identifiants invalides',
        message: 'Email ou mot de passe incorrect'
      });
    }

    const user = users[0];

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Identifiants invalides',
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Parser genres_preferences si c'est JSON
    let genresPreferences = [];
    if (user.genres_preferences) {
      try {
        genresPreferences = typeof user.genres_preferences === 'string' 
          ? JSON.parse(user.genres_preferences) 
          : user.genres_preferences;
      } catch (e) {
        genresPreferences = [];
      }
    }

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        photoUrl: user.photo_url,
        bio: user.bio,
        role: user.role,
        genresPreferences: genresPreferences
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la connexion'
    });
  }
};

/**
 * Demande de réinitialisation de mot de passe
 */
const requestPasswordReset = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { email } = req.body;

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 heure

    // Mettre à jour l'utilisateur avec le token
    const [result] = await pool.execute(
      `UPDATE users 
       SET reset_password_token = ?, reset_password_expires = ? 
       WHERE email = ?`,
      [resetTokenHash, resetExpires, email]
    );

    // Ne pas révéler si l'email existe ou non (sécurité)
    if (result.affectedRows > 0) {
      // En production, envoyer un email avec le lien de réinitialisation
      // Pour l'instant, on retourne le token (à ne PAS faire en production)
      console.log(`Token de réinitialisation pour ${email}: ${resetToken}`);
      
      res.json({
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
        // En production, ne pas retourner le token
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      });
    } else {
      // Même réponse pour ne pas révéler si l'email existe
      res.json({
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Réinitialisation du mot de passe avec le token
 */
const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { token, newPassword } = req.body;

    // Hasher le token pour le comparer avec celui en base
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Récupérer l'utilisateur avec ce token valide
    const [users] = await pool.execute(
      `SELECT id FROM users 
       WHERE reset_password_token = ? 
       AND reset_password_expires > NOW()`,
      [resetTokenHash]
    );

    if (users.length === 0) {
      return res.status(400).json({
        error: 'Token invalide ou expiré',
        message: 'Le lien de réinitialisation n\'est plus valide'
      });
    }

    const userId = users[0].id;

    // Hasher le nouveau mot de passe
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour le mot de passe et supprimer le token
    await pool.execute(
      `UPDATE users 
       SET password_hash = ?, 
           reset_password_token = NULL, 
           reset_password_expires = NULL 
       WHERE id = ?`,
      [passwordHash, userId]
    );

    res.json({
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

/**
 * Vérification du token (pour vérifier si l'utilisateur est toujours connecté)
 */
const verifyToken = async (req, res) => {
  try {
    // Le middleware authenticateToken a déjà vérifié le token
    // et ajouté req.user
    let genresPreferences = [];
    if (req.user.genres_preferences) {
      try {
        genresPreferences = typeof req.user.genres_preferences === 'string' 
          ? JSON.parse(req.user.genres_preferences) 
          : req.user.genres_preferences;
      } catch (e) {
        genresPreferences = [];
      }
    }

    res.json({
      valid: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        pseudo: req.user.pseudo,
        photoUrl: req.user.photo_url,
        bio: req.user.bio,
        role: req.user.role,
        genresPreferences: genresPreferences
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue'
    });
  }
};

module.exports = {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  verifyToken
};
