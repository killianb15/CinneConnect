# 🎬 CinéConnect

Application web sociale autour du cinéma permettant aux utilisateurs de partager leurs passions cinématographiques, créer des groupes thématiques, noter et commenter des films.

## 📋 Structure du projet

```
devIA/
├── backend/          # API Node.js/Express
│   ├── config/       # Configuration (Swagger, DB, etc.)
│   ├── routes/       # Routes API
│   └── server.js     # Point d'entrée du serveur
│
└── frontend/         # Application React
    └── src/          # Code source React
        ├── pages/    # Pages de l'application
        ├── components/ # Composants réutilisables
        └── App.jsx   # Composant principal
```

## 🚀 Installation et démarrage

### Prérequis

- Node.js (version 18 ou supérieure)
- PostgreSQL (version 14 ou supérieure)
- npm ou yarn

### Configuration de PostgreSQL

1. **Créer la base de données**
```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Créer la base de données
CREATE DATABASE cineconnect;

# Quitter psql
\q
```

2. **Vérifier la connexion**
   - Assurez-vous que PostgreSQL est démarré : `sudo systemctl status postgresql`
   - Vérifiez les identifiants dans le fichier `.env` du backend

### Backend

1. **Installer les dépendances**
```bash
cd backend
npm install
```

2. **Configurer les variables d'environnement**
```bash
cp env.example .env
# Éditer .env et configurer :
# - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# - JWT_SECRET (changez la valeur par défaut en production)
```

3. **Démarrer le serveur en mode développement**
```bash
npm run dev
```

**Note** : La base de données sera initialisée automatiquement au démarrage du serveur.

Le serveur sera accessible sur `http://localhost:3000`
- API : `http://localhost:3000/api`
- Documentation Swagger : `http://localhost:3000/api-docs`
- Health check : `http://localhost:3000/api/health`

### Frontend

1. **Installer les dépendances**
```bash
cd frontend
npm install
```

2. **Démarrer le serveur de développement**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 🧪 Tests manuels

### Test du backend

1. **Vérifier que le serveur démarre**
   - Exécuter `npm run dev` dans le dossier `backend`
   - Vérifier les messages dans la console
   - Vous devriez voir : `✅ Connexion à PostgreSQL réussie` et `✅ Tables de base de données initialisées`

2. **Tester le health check**
   - Ouvrir `http://localhost:3000/api/health` dans un navigateur
   - Vous devriez voir : `{"status":"OK","message":"Serveur CinéConnect opérationnel","timestamp":"..."}`

3. **Tester la documentation Swagger**
   - Ouvrir `http://localhost:3000/api-docs` dans un navigateur
   - La documentation interactive devrait s'afficher avec les routes d'authentification

4. **Tester l'inscription (via Swagger ou curl)**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test1234","pseudo":"testuser"}'
   ```

5. **Tester la connexion**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test1234"}'
   ```

### Test du frontend

1. **Vérifier que l'application démarre**
   - Exécuter `npm run dev` dans le dossier `frontend`
   - Ouvrir `http://localhost:5173` dans un navigateur
   - Vous devriez voir la page d'accueil avec "Bienvenue sur CinéConnect !"

2. **Tester l'inscription**
   - Cliquer sur "S'inscrire" ou aller sur `http://localhost:5173/register`
   - Remplir le formulaire avec :
     - Email valide
     - Pseudo (3-100 caractères)
     - Mot de passe (min 8 caractères avec majuscule, minuscule et chiffre)
   - Après inscription réussie, vous serez redirigé vers la page d'accueil

3. **Tester la connexion**
   - Aller sur `http://localhost:5173/login`
   - Se connecter avec les identifiants créés
   - Après connexion réussie, vous serez redirigé vers la page d'accueil

## 📚 Technologies utilisées

### Backend
- **Node.js** : Runtime JavaScript
- **Express** : Framework web
- **Swagger** : Documentation API
- **PostgreSQL** : Base de données relationnelle
- **JWT** : Authentification par tokens
- **bcryptjs** : Hashing des mots de passe
- **express-validator** : Validation des données

### Frontend
- **React** : Bibliothèque UI
- **React Router** : Routage
- **Vite** : Build tool et serveur de développement
- **Axios** : Client HTTP pour les requêtes API

## 🔒 Sécurité

- Helmet configuré pour sécuriser les en-têtes HTTP
- Rate limiting activé pour limiter les abus
- CORS configuré pour le frontend
- Variables d'environnement pour les secrets

## ✅ Fonctionnalités implémentées

- ✅ Configuration PostgreSQL et initialisation automatique des tables
- ✅ Système d'authentification complet :
  - Inscription avec validation
  - Connexion avec JWT
  - Récupération de mot de passe
  - Middleware d'authentification JWT
- ✅ Pages frontend d'inscription et de connexion
- ✅ Documentation API Swagger complète

## 📝 Prochaines phases

- Phase 4 : Gestion des profils utilisateurs
- Phase 5 : CRUD des groupes thématiques
- Phase 6 : Intégration API TMDB et gestion des films
- Phase 7 : Système d'interactions sociales (commentaires, notes, likes)
- Phase 8 : Fil d'actualité

## 📄 Licence

ISC

