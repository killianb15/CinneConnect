/**
 * Script pour créer des reviews de test
 * Usage: node scripts/createTestReviews.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const reviews = [
  {
    userEmail: 'alice@test.com',
    filmTitre: 'Fight Club',
    note: 5,
    commentaire: 'Un chef-d\'œuvre absolu ! La narration est brillante et le message reste d\'actualité. Un film à voir et revoir.'
  },
  {
    userEmail: 'bob@test.com',
    filmTitre: 'Les Évadés',
    note: 5,
    commentaire: 'Un film magnifique sur l\'espoir et l\'amitié. La performance de Morgan Freeman est exceptionnelle.'
  },
  {
    userEmail: 'charlie@test.com',
    filmTitre: 'Le Parrain',
    note: 5,
    commentaire: 'Le film de gangsters par excellence. Marlon Brando est magistral dans le rôle titre.'
  },
  {
    userEmail: 'diana@test.com',
    filmTitre: 'Fight Club',
    note: 4,
    commentaire: 'Excellent film, très bien réalisé. Le twist final est surprenant !'
  },
  {
    userEmail: 'alice@test.com',
    filmTitre: 'Schindler\'s List',
    note: 5,
    commentaire: 'Un film bouleversant et nécessaire. La réalisation de Spielberg est remarquable.'
  },
  {
    userEmail: 'bob@test.com',
    filmTitre: 'Forrest Gump',
    note: 4,
    commentaire: 'Un film touchant avec Tom Hanks au meilleur de sa forme. L\'histoire est émouvante.'
  }
];

async function createTestReviews() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'cineconnect',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    console.log('🔄 Création des reviews de test...\n');

    for (const reviewData of reviews) {
      try {
        // Récupérer l'utilisateur
        const [users] = await connection.execute(
          'SELECT id FROM users WHERE email = ?',
          [reviewData.userEmail]
        );

        if (users.length === 0) {
          console.log(`⏭️  Utilisateur ${reviewData.userEmail} non trouvé, ignoré`);
          continue;
        }

        const userId = users[0].id;

        // Récupérer le film
        const [films] = await connection.execute(
          'SELECT id FROM films WHERE titre = ?',
          [reviewData.filmTitre]
        );

        if (films.length === 0) {
          console.log(`⏭️  Film "${reviewData.filmTitre}" non trouvé, ignoré`);
          continue;
        }

        const filmId = films[0].id;

        // Vérifier si la review existe déjà
        const [existing] = await connection.execute(
          'SELECT id FROM reviews WHERE user_id = ? AND film_id = ?',
          [userId, filmId]
        );

        if (existing.length > 0) {
          console.log(`⏭️  Review déjà existante pour ${reviewData.userEmail} sur "${reviewData.filmTitre}"`);
          continue;
        }

        // Créer la review
        await connection.execute(
          'INSERT INTO reviews (user_id, film_id, note, commentaire) VALUES (?, ?, ?, ?)',
          [userId, filmId, reviewData.note, reviewData.commentaire]
        );

        // Mettre à jour la note moyenne du film
        const [avgResult] = await connection.execute(
          'SELECT AVG(note) as moyenne FROM reviews WHERE film_id = ?',
          [filmId]
        );

        await connection.execute(
          'UPDATE films SET note_moyenne = ? WHERE id = ?',
          [avgResult[0].moyenne || 0, filmId]
        );

        console.log(`✅ Review créée: ${reviewData.userEmail} sur "${reviewData.filmTitre}"`);
      } catch (error) {
        console.error(`❌ Erreur pour ${reviewData.userEmail}:`, error.message);
      }
    }

    console.log('\n✅ Script terminé !');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await connection.end();
  }
}

createTestReviews();


