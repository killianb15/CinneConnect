/**
 * Configuration Swagger pour la documentation de l'API CinéConnect
 * Accès à la documentation : http://localhost:3000/api-docs
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CinéConnect API',
      version: '1.0.0',
      description: 'API REST pour l\'application sociale CinéConnect - Application communautaire autour du cinéma',
      contact: {
        name: 'Support CinéConnect',
        email: 'support@cineconnect.fr'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Serveur de développement'
      },
      {
        url: 'https://api.cineconnect.fr',
        description: 'Serveur de production'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenu lors de la connexion'
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Vérification de l\'état du serveur'
      },
      {
        name: 'Authentification',
        description: 'Inscription, connexion et gestion des tokens JWT'
      },
      {
        name: 'Utilisateurs',
        description: 'Gestion des profils utilisateurs'
      },
      {
        name: 'Groupes',
        description: 'CRUD des groupes thématiques'
      },
      {
        name: 'Films',
        description: 'Recherche, consultation et gestion des films'
      },
      {
        name: 'Interactions',
        description: 'Commentaires, notes, likes et favoris'
      }
    ]
  },
  // Chemins vers les fichiers contenant les annotations Swagger
  apis: ['./routes/*.js', './server.js']
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Configure Swagger UI dans l'application Express
 * @param {Express} app - Instance Express
 */
function swaggerSetup(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CinéConnect API Documentation'
  }));

  // Route pour obtenir le JSON de la spécification Swagger
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

module.exports = swaggerSetup;

