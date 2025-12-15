/**
 * Script pour créer des groupes de test avec des membres et des films
 * Usage: node scripts/createTestGroups.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const groupes = [
  {
    titre: 'Fans de Science-Fiction',
    description: 'Groupe pour les amateurs de films de science-fiction et de space opera',
    thematique: 'Science-Fiction',
    isPublic: true,
    createurEmail: 'marie@test.com',
    membres: ['pierre@test.com', 'sophie@test.com'],
    films: ['Inception', 'The Dark Knight']
  },
  {
    titre: 'Cinéma Classique',
    description: 'Discussion autour des grands classiques du cinéma',
    thematique: 'Classiques',
    isPublic: true,
    createurEmail: 'sophie@test.com',
    membres: ['marie@test.com', 'lucas@test.com'],
    films: ['Le Parrain', 'Les Évadés', 'Pulp Fiction']
  },
  {
    titre: 'Films d\'Horreur',
    description: 'Pour les fans de frissons et de films d\'horreur',
    thematique: 'Horreur',
    isPublic: false,
    createurEmail: 'pierre@test.com',
    membres: ['lucas@test.com'],
    films: []
  },
  {
    titre: 'Comédies Modernes',
    description: 'Les meilleures comédies récentes',
    thematique: 'Comédie',
    isPublic: true,
    createurEmail: 'lucas@test.com',
    membres: ['marie@test.com'],
    films: ['Forrest Gump']
  }
];

async function createTestGroups() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'cineconnect',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    console.log('🔄 Création des groupes de test...\n');

    for (const groupeData of groupes) {
      try {
        // Récupérer le créateur
        const [createurs] = await connection.execute(
          'SELECT id FROM users WHERE email = ?',
          [groupeData.createurEmail]
        );

        if (createurs.length === 0) {
          console.log(`⏭️  Créateur ${groupeData.createurEmail} non trouvé`);
          continue;
        }

        const createurId = createurs[0].id;

        // Vérifier si le groupe existe déjà
        const [existing] = await connection.execute(
          'SELECT id FROM groupes WHERE titre = ?',
          [groupeData.titre]
        );

        if (existing.length > 0) {
          console.log(`⏭️  Groupe "${groupeData.titre}" existe déjà`);
          continue;
        }

        // Créer le groupe
        const [result] = await connection.execute(
          `INSERT INTO groupes (createur_id, titre, description, thematique, is_public)
           VALUES (?, ?, ?, ?, ?)`,
          [createurId, groupeData.titre, groupeData.description, groupeData.thematique, groupeData.isPublic]
        );

        const groupId = result.insertId;

        // Ajouter le créateur comme admin
        await connection.execute(
          'INSERT INTO groupe_membres (groupe_id, user_id, role) VALUES (?, ?, ?)',
          [groupId, createurId, 'admin']
        );

        console.log(`✅ Groupe créé: "${groupeData.titre}"`);

        // Ajouter les membres
        for (const membreEmail of groupeData.membres) {
          const [membres] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [membreEmail]
          );

          if (membres.length > 0) {
            await connection.execute(
              'INSERT INTO groupe_membres (groupe_id, user_id, role) VALUES (?, ?, ?)',
              [groupId, membres[0].id, 'membre']
            );
            console.log(`   ✅ Membre ajouté: ${membreEmail}`);
          }
        }

        // Ajouter les films
        for (const filmTitre of groupeData.films) {
          const [films] = await connection.execute(
            'SELECT id FROM films WHERE titre = ?',
            [filmTitre]
          );

          if (films.length > 0) {
            await connection.execute(
              'INSERT INTO groupe_films (groupe_id, film_id, ajoute_par) VALUES (?, ?, ?)',
              [groupId, films[0].id, createurId]
            );
            console.log(`   ✅ Film ajouté: ${filmTitre}`);
          }
        }
      } catch (error) {
        console.error(`❌ Erreur pour "${groupeData.titre}":`, error.message);
      }
    }

    console.log('\n✅ Script terminé !');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await connection.end();
  }
}

createTestGroups();


