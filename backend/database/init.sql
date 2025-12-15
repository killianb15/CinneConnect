-- Script d'initialisation de la base de données CinéConnect
-- À exécuter une seule fois pour créer toutes les tables et index
-- Usage: mysql -u root -p cineconnect < database/init.sql

-- Désactiver temporairement les vérifications de clés étrangères pour éviter les erreurs
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- TABLE DES UTILISATEURS
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES TOKENS DE RAFRAÎCHISSEMENT
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES FILMS
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES REVIEWS (NOTES ET COMMENTAIRES)
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES FILMS PRÉFÉRÉS DES UTILISATEURS
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES GROUPES THÉMATIQUES
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES MEMBRES DE GROUPES
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES INVITATIONS AUX GROUPES
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES FILMS DANS LES GROUPES
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES NOTIFICATIONS
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES MESSAGES DE GROUPE
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES RELATIONS D'AMITIÉ (FOLLOWERS/FOLLOWING)
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES LIKES SUR LES REVIEWS
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES RÉPONSES AUX COMMENTAIRES
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES SIGNALEMENTS DE CONTENU (MODÉRATION)
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES DEMANDES D'AMIS
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE DES AMIS (RELATIONS D'AMITIÉ ACCEPTÉES)
-- ============================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INDEX SUPPLÉMENTAIRES POUR AMÉLIORER LES PERFORMANCES
-- ============================================

-- Index pour la table users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_pseudo ON users(pseudo);

-- Index pour la table refresh_tokens
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Index pour la table films
CREATE INDEX idx_films_tmdb_id ON films(tmdb_id);
CREATE INDEX idx_films_date_sortie ON films(date_sortie);

-- Index pour la table reviews
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_film_id ON reviews(film_id);

-- Index pour la table groupes
CREATE INDEX idx_groupes_createur_id ON groupes(createur_id);

-- Index pour la table groupe_membres
CREATE INDEX idx_groupe_membres_groupe_id ON groupe_membres(groupe_id);
CREATE INDEX idx_groupe_membres_user_id ON groupe_membres(user_id);

-- Index pour la table groupe_invitations
CREATE INDEX idx_groupe_invitations_invite_id ON groupe_invitations(invite_id);

-- Index pour la table notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Index pour la table groupe_messages
CREATE INDEX idx_groupe_messages_user_id ON groupe_messages(user_id);

-- Index pour la table friend_requests
CREATE INDEX idx_friend_requests_requester_id ON friend_requests(requester_id);
CREATE INDEX idx_friend_requests_receiver_id ON friend_requests(receiver_id);

-- Index pour la table friends
CREATE INDEX idx_friends_user1_id ON friends(user1_id);
CREATE INDEX idx_friends_user2_id ON friends(user2_id);

-- Note: Les index suivants sont déjà créés dans les définitions de tables ci-dessus:
-- - idx_review_likes_review_id et idx_review_likes_user_id (dans review_likes)
-- - idx_comment_replies_parent_id, idx_comment_replies_user_id, idx_comment_replies_created_at (dans comment_replies)
-- - idx_reported_content_type_id, idx_reported_content_status, idx_reported_content_reporter_id (dans reported_content)
-- - idx_follower_id et idx_following_id (dans user_follows)
-- - idx_user_position (dans user_favorite_films)
-- - idx_groupe_messages_groupe_id et idx_groupe_messages_created_at (dans groupe_messages)
-- - idx_requester_id, idx_receiver_id, idx_status (dans friend_requests)
-- - idx_user1_id et idx_user2_id (dans friends)

-- Réactiver les vérifications de clés étrangères
SET FOREIGN_KEY_CHECKS = 1;

-- Message de confirmation
SELECT '✅ Base de données CinéConnect initialisée avec succès!' AS message;
