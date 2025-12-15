# Configuration de la base de données CinéConnect

## Base de données MySQL/MariaDB

Ce projet utilise MySQL ou MariaDB comme base de données.

## Configuration

Les paramètres de connexion sont définis dans le fichier `.env` :

```env
DB_HOST=localhost
DB_NAME=cineconnect
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
```

## Initialisation de la base de données

Il existe **deux méthodes** pour initialiser la base de données :

### Méthode 1 : Script SQL (Recommandé)

Cette méthode utilise le script SQL complet pour créer toutes les tables et index.

#### Option A : Via le script Node.js

```bash
# Depuis le dossier backend
node scripts/initDatabase.js
```

Ce script :
- Crée automatiquement la base de données si elle n'existe pas
- Exécute le script SQL `database/init.sql`
- Affiche les messages de confirmation

#### Option B : Via MySQL en ligne de commande

```bash
# Créer la base de données d'abord (si elle n'existe pas)
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS cineconnect;"

# Exécuter le script SQL
mysql -u root -p cineconnect < database/init.sql
```

### Méthode 2 : Initialisation automatique (via Node.js)

Lors du démarrage du serveur backend (`npm run dev`), les tables seront créées automatiquement si elles n'existent pas.

**Note** : Si vous rencontrez des erreurs avec cette méthode, utilisez plutôt la Méthode 1 (script SQL).

## Vérification de la connexion

### Vérifier que MySQL est démarré

**Windows** :
```bash
# Vérifier le service MySQL
sc query MySQL80
```

**Linux/Mac** :
```bash
sudo systemctl status mysql
# ou
sudo service mysql status
```

### Tester la connexion

```bash
mysql -u root -p -e "SELECT VERSION();"
```

### Vérifier que la base de données existe

```bash
mysql -u root -p -e "SHOW DATABASES LIKE 'cineconnect';"
```

## Résolution des problèmes

### Erreur : "You have an error in your SQL syntax"

Si vous rencontrez cette erreur lors de l'initialisation automatique, utilisez le script SQL directement :

```bash
node scripts/initDatabase.js
```

### Erreur : "Access denied"

Vérifiez vos identifiants dans le fichier `.env` et assurez-vous que l'utilisateur MySQL a les permissions nécessaires :

```sql
GRANT ALL PRIVILEGES ON cineconnect.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### Réinitialiser la base de données

Si vous voulez réinitialiser complètement la base de données :

```bash
# ATTENTION : Cela supprimera toutes les données !
mysql -u root -p -e "DROP DATABASE IF EXISTS cineconnect;"
node scripts/initDatabase.js
```

## Structure de la base de données

Le script `database/init.sql` crée les tables suivantes :

- `users` - Utilisateurs
- `refresh_tokens` - Tokens de rafraîchissement
- `films` - Films
- `reviews` - Avis et notes
- `user_favorite_films` - Films favoris des utilisateurs
- `groupes` - Groupes thématiques
- `groupe_membres` - Membres des groupes
- `groupe_invitations` - Invitations aux groupes
- `groupe_films` - Films dans les groupes
- `notifications` - Notifications
- `groupe_messages` - Messages de groupe
- `user_follows` - Relations de suivi
- `review_likes` - Likes sur les avis
- `comment_replies` - Réponses aux commentaires
- `reported_content` - Contenu signalé (modération)
- `friend_requests` - Demandes d'amis
- `friends` - Relations d'amitié

Toutes les tables incluent les index nécessaires pour optimiser les performances.
