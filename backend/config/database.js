/**
 * Configuration de la connexion à MySQL/MariaDB
 * Gère la connexion et la réinitialisation de la base de données
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuration de la connexion MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'cineconnect',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Teste la connexion à la base de données
 * @returns {Promise<boolean>} True si la connexion réussit
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT NOW() as now');
    connection.release();
    console.log('✅ Connexion à MySQL réussie:', rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à MySQL:', error.message);
    return false;
  }
}

/**
 * Crée un index s'il n'existe pas déjà
 * Compatible avec toutes les versions de MySQL
 */
async function createIndexIfNotExists(connection, indexName, tableName, columns) {
  try {
    // Vérifier si l'index existe déjà
    const [indexes] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = ? 
      AND index_name = ?
    `, [tableName, indexName]);
    
    if (indexes[0].count === 0) {
      await connection.execute(`CREATE INDEX ${indexName} ON ${tableName}(${columns})`);
    }
  } catch (error) {
    // Ignorer l'erreur si l'index existe déjà (code 1061)
    if (error.code !== 'ER_DUP_KEYNAME') {
      throw error;
    }
  }
}

/**
 * Initialise les tables de la base de données
 * Crée les tables si elles n'existent pas
 */
async function initializeDatabase() {
  const connection = await pool.getConnection();
  
  try {
    // Table des utilisateurs
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        pseudo VARCHAR(100) NOT NULL,
        photo_url VARCHAR(500),
        bio TEXT,
        genres_preferences JSON,
        role VARCHAR(50) DEFAULT 'membre',
        is_email_verified BOOLEAN DEFAULT FALSE,
        reset_password_token VARCHAR(255),
        reset_password_expires TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT chk_role CHECK (role IN ('admin', 'moderateur', 'membre'))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table pour les tokens de rafraîchissement (pour une future implémentation)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table des films
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS films (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tmdb_id INT UNIQUE,
        titre VARCHAR(255) NOT NULL,
        titre_original VARCHAR(255),
        synopsis TEXT,
        date_sortie DATE,
        duree INT,
        affiche_url VARCHAR(500),
        note_moyenne DECIMAL(3,1) DEFAULT 0,
        nombre_votes INT DEFAULT 0,
        genres JSON,
        realisateur VARCHAR(255),
        casting JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table des reviews (notes et commentaires)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        film_id INT NOT NULL,
        note INT CHECK (note >= 1 AND note <= 5),
        commentaire TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_film (user_id, film_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table des films préférés des utilisateurs
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_favorite_films (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        film_id INT NOT NULL,
        position INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_favorite_film (user_id, film_id),
        INDEX idx_user_position (user_id, position)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table des groupes thématiques
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS groupes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        createur_id INT NOT NULL,
        titre VARCHAR(255) NOT NULL,
        description TEXT,
        image_couverture VARCHAR(500),
        thematique VARCHAR(100),
        is_public BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (createur_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table des membres de groupes (avec rôles)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS groupe_membres (
        id INT AUTO_INCREMENT PRIMARY KEY,
        groupe_id INT NOT NULL,
        user_id INT NOT NULL,
        role VARCHAR(50) DEFAULT 'membre',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (groupe_id) REFERENCES groupes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_groupe_user (groupe_id, user_id),
        CONSTRAINT chk_groupe_role CHECK (role IN ('admin', 'moderateur', 'membre'))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table des invitations aux groupes
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS groupe_invitations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        groupe_id INT NOT NULL,
        inviteur_id INT NOT NULL,
        invite_id INT NOT NULL,
        statut VARCHAR(50) DEFAULT 'en_attente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (groupe_id) REFERENCES groupes(id) ON DELETE CASCADE,
        FOREIGN KEY (inviteur_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invite_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT chk_invitation_statut CHECK (statut IN ('en_attente', 'acceptee', 'refusee'))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table des films dans les groupes
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS groupe_films (
        id INT AUTO_INCREMENT PRIMARY KEY,
        groupe_id INT NOT NULL,
        film_id INT NOT NULL,
        ajoute_par INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (groupe_id) REFERENCES groupes(id) ON DELETE CASCADE,
        FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE,
        FOREIGN KEY (ajoute_par) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_groupe_film (groupe_id, film_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table des notifications basiques
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        titre VARCHAR(255) NOT NULL,
        message TEXT,
        lien VARCHAR(500),
        is_lu BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT chk_notification_type CHECK (type IN ('invitation_groupe', 'nouveau_membre', 'nouveau_film', 'nouvelle_review', 'autre'))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table des messages de groupe (discussion)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS groupe_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        groupe_id INT NOT NULL,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (groupe_id) REFERENCES groupes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_groupe_messages_groupe_id (groupe_id),
        INDEX idx_groupe_messages_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table des relations d'amitié (followers/following)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_follows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        follower_id INT NOT NULL,
        following_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_follow (follower_id, following_id),
        INDEX idx_follower_id (follower_id),
        INDEX idx_following_id (following_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table des likes sur les reviews
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS review_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        review_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_review_like (review_id, user_id),
        INDEX idx_review_likes_review_id (review_id),
        INDEX idx_review_likes_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table des réponses aux commentaires (reviews)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS comment_replies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parent_review_id INT NOT NULL,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_review_id) REFERENCES reviews(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_comment_replies_parent_id (parent_review_id),
        INDEX idx_comment_replies_user_id (user_id),
        INDEX idx_comment_replies_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table des signalements de contenu (modération)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reported_content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content_type VARCHAR(50) NOT NULL,
        content_id INT NOT NULL,
        reporter_id INT NOT NULL,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        moderator_id INT NULL,
        moderator_action VARCHAR(50) NULL,
        moderator_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT chk_content_type CHECK (content_type IN ('review', 'comment_reply', 'group_message', 'user')),
        CONSTRAINT chk_report_status CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
        CONSTRAINT chk_moderator_action CHECK (moderator_action IN ('delete', 'warn', 'ban', 'no_action', NULL)),
        INDEX idx_reported_content_type_id (content_type, content_id),
        INDEX idx_reported_content_status (status),
        INDEX idx_reported_content_reporter_id (reporter_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table des demandes d'amis
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requester_id INT NOT NULL,
        receiver_id INT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_friend_request (requester_id, receiver_id),
        INDEX idx_requester_id (requester_id),
        INDEX idx_receiver_id (receiver_id),
        INDEX idx_status (status),
        CONSTRAINT chk_friend_request_status CHECK (status IN ('pending', 'accepted', 'rejected'))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table des amis (relations d'amitié acceptées)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS friends (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user1_id INT NOT NULL,
        user2_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_friendship (user1_id, user2_id),
        INDEX idx_user1_id (user1_id),
        INDEX idx_user2_id (user2_id),
        CHECK (user1_id < user2_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Index pour améliorer les performances
    // Note: Certains index sont déjà créés dans les définitions de tables ci-dessus
    await createIndexIfNotExists(connection, 'idx_users_email', 'users', 'email');
    await createIndexIfNotExists(connection, 'idx_users_pseudo', 'users', 'pseudo');
    await createIndexIfNotExists(connection, 'idx_refresh_tokens_user_id', 'refresh_tokens', 'user_id');
    await createIndexIfNotExists(connection, 'idx_films_tmdb_id', 'films', 'tmdb_id');
    await createIndexIfNotExists(connection, 'idx_films_date_sortie', 'films', 'date_sortie');
    await createIndexIfNotExists(connection, 'idx_reviews_user_id', 'reviews', 'user_id');
    await createIndexIfNotExists(connection, 'idx_reviews_film_id', 'reviews', 'film_id');
    await createIndexIfNotExists(connection, 'idx_groupes_createur_id', 'groupes', 'createur_id');
    await createIndexIfNotExists(connection, 'idx_groupe_membres_groupe_id', 'groupe_membres', 'groupe_id');
    await createIndexIfNotExists(connection, 'idx_groupe_membres_user_id', 'groupe_membres', 'user_id');
    await createIndexIfNotExists(connection, 'idx_groupe_invitations_invite_id', 'groupe_invitations', 'invite_id');
    await createIndexIfNotExists(connection, 'idx_notifications_user_id', 'notifications', 'user_id');
    await createIndexIfNotExists(connection, 'idx_groupe_messages_user_id', 'groupe_messages', 'user_id');
    // Les index suivants sont déjà créés dans les CREATE TABLE, mais on les garde pour compatibilité
    // (la fonction createIndexIfNotExists vérifie l'existence avant de créer)

    console.log('✅ Tables de base de données initialisées avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testConnection,
  initializeDatabase
};
