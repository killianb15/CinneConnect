/**
 * Serveur principal de l'application CinéConnect
 * Point d'entrée du backend Node.js/Express
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
require('dotenv').config();

// Import de la configuration Swagger
const swaggerSetup = require('./config/swagger');

// Import de la configuration de la base de données
const { testConnection, initializeDatabase } = require('./config/database');

// Import des routes
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const reviewRoutes = require('./routes/reviews');
const reviewLikeRoutes = require('./routes/reviewLikes');
const commentReplyRoutes = require('./routes/commentReplies');
const replyRoutes = require('./routes/replies');
const feedRoutes = require('./routes/feed');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const groupRoutes = require('./routes/groups');
const moderationRoutes = require('./routes/moderation');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Configuration Socket.io pour les WebSockets
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Stocker l'instance io pour l'utiliser dans les contrôleurs
app.set('io', io);

// Configuration de la sécurité avec Helmet
app.use(helmet());

// Configuration CORS pour permettre les requêtes depuis le frontend
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Limitation du taux de requêtes pour éviter les abus
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite de 100 requêtes par fenêtre de 15 minutes
});
app.use('/api/', limiter);

// Middleware pour parser le JSON dans les requêtes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration Swagger pour la documentation API
swaggerSetup(app);

// Initialisation de la base de données au démarrage
async function initializeApp() {
  try {
    // Tester la connexion à MySQL
    const isConnected = await testConnection();
    if (!isConnected) {
      console.warn('⚠️  Connexion à MySQL échouée. Certaines fonctionnalités ne seront pas disponibles.');
      return;
    }
    
    // Initialiser les tables
    await initializeDatabase();
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error.message);
    console.warn('⚠️  Le serveur démarre quand même, mais certaines fonctionnalités ne seront pas disponibles.');
  }
}

// Lancer l'initialisation
initializeApp();

// Route de test pour vérifier que le serveur fonctionne
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Vérification de l'état du serveur
 *     description: Endpoint de health check pour vérifier que l'API est opérationnelle
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Serveur opérationnel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 message:
 *                   type: string
 *                   example: Serveur CinéConnect opérationnel
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2024-01-15T10:30:00.000Z
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Serveur CinéConnect opérationnel',
    timestamp: new Date().toISOString()
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reviews', reviewLikeRoutes); // Routes pour les likes sur les reviews
app.use('/api/reviews', commentReplyRoutes); // Routes pour les réponses aux commentaires
app.use('/api/replies', replyRoutes); // Route DELETE pour supprimer une réponse
app.use('/api/feed', feedRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users', friendRoutes); // Routes pour les amis (discover, friend-requests, etc.)
app.use('/api/groups', groupRoutes);
app.use('/api/moderation', moderationRoutes); // Routes pour la modération
app.use('/api/notifications', notificationRoutes);

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.path
  });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Middleware d'authentification pour WebSocket
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Token manquant'));
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Token invalide'));
  }
});

// Gestion des connexions WebSocket
io.on('connection', (socket) => {
  console.log(`✅ Client connecté: ${socket.id} (User ID: ${socket.userId})`);

  // Rejoindre une room pour un groupe spécifique
  socket.on('join-group', (groupId) => {
    socket.join(`group-${groupId}`);
    console.log(`👤 Client ${socket.id} a rejoint le groupe ${groupId}`);
  });

  // Quitter une room
  socket.on('leave-group', (groupId) => {
    socket.leave(`group-${groupId}`);
    console.log(`👋 Client ${socket.id} a quitté le groupe ${groupId}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client déconnecté: ${socket.id}`);
  });
});

// Démarrage du serveur
server.listen(PORT, () => {
  console.log(`🚀 Serveur CinéConnect démarré sur le port ${PORT}`);
  console.log(`📚 Documentation API disponible sur http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health check disponible sur http://localhost:${PORT}/api/health`);
  console.log(`🔌 WebSocket disponible sur ws://localhost:${PORT}`);
});

module.exports = { app, server, io };

