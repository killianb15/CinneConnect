/**
 * Script pour créer des comptes de test dans la base de données
 * Usage: node scripts/createTestUsers.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const users = [
  {
    email: 'alice@test.com',
    password: 'Test1234',
    pseudo: 'AliceCinema',
    bio: 'Passionnée de cinéma indépendant et de films d\'auteur'
  },
  {
    email: 'bob@test.com',
    password: 'Test1234',
    pseudo: 'BobMovie',
    bio: 'Fan de blockbusters et de films d\'action'
  },
  {
    email: 'charlie@test.com',
    password: 'Test1234',
    pseudo: 'CharlieFilm',
    bio: 'Critique amateur, j\'adore partager mes découvertes'
  },
  {
    email: 'diana@test.com',
    password: 'Test1234',
    pseudo: 'DianaScreen',
    bio: 'Cinéphile depuis toujours, spécialiste des films classiques'
  }
];

async function createTestUsers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'cineconnect',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    console.log('🔄 Création des comptes de test...\n');

    for (const userData of users) {
      try {
        // Vérifier si l'utilisateur existe déjà
        const [existing] = await connection.execute(
          'SELECT id FROM users WHERE email = ?',
          [userData.email]
        );

        if (existing.length > 0) {
          console.log(`⏭️  Utilisateur ${userData.email} existe déjà, ignoré`);
          continue;
        }

        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(userData.password, 10);

        // Créer l'utilisateur
        await connection.execute(
          'INSERT INTO users (email, password_hash, pseudo, bio) VALUES (?, ?, ?, ?)',
          [userData.email, passwordHash, userData.pseudo, userData.bio]
        );

        console.log(`✅ Compte créé: ${userData.email} (${userData.pseudo})`);
      } catch (error) {
        console.error(`❌ Erreur pour ${userData.email}:`, error.message);
      }
    }

    console.log('\n✅ Script terminé !');
    console.log('\n📝 Comptes de test créés:');
    users.forEach(u => {
      console.log(`   - ${u.email} / ${u.password} (${u.pseudo})`);
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await connection.end();
  }
}

createTestUsers();


