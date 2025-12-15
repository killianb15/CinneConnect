/**
 * Script pour créer des comptes de test avec des reviews
 * Usage: node scripts/createTestAccountsWithReviews.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const accounts = [
  {
    email: 'marie@test.com',
    password: 'test',
    pseudo: 'MarieCinema',
    bio: 'Passionnée de cinéma français et international'
  },
  {
    email: 'pierre@test.com',
    password: 'test',
    pseudo: 'PierreFilm',
    bio: 'Fan de films d\'action et de science-fiction'
  },
  {
    email: 'sophie@test.com',
    password: 'test',
    pseudo: 'SophieScreen',
    bio: 'Critique de films, j\'adore partager mes avis'
  },
  {
    email: 'lucas@test.com',
    password: 'test',
    pseudo: 'LucasMovie',
    bio: 'Cinéphile depuis toujours'
  }
];

const reviews = [
  {
    userEmail: 'marie@test.com',
    filmTitre: 'Fight Club',
    note: 5,
    commentaire: 'Un film incroyable ! La réalisation de David Fincher est magistrale. Le twist final m\'a complètement surpris. Un chef-d\'œuvre du cinéma moderne.'
  },
  {
    userEmail: 'pierre@test.com',
    filmTitre: 'The Dark Knight',
    note: 5,
    commentaire: 'Le meilleur film de super-héros jamais réalisé ! Heath Ledger est exceptionnel dans le rôle du Joker. Christopher Nolan a créé quelque chose de vraiment spécial.'
  },
  {
    userEmail: 'sophie@test.com',
    filmTitre: 'Inception',
    note: 4,
    commentaire: 'Un film complexe mais fascinant. La réalisation est impressionnante et le concept est original. Parfait pour ceux qui aiment réfléchir pendant un film.'
  },
  {
    userEmail: 'lucas@test.com',
    filmTitre: 'Pulp Fiction',
    note: 5,
    commentaire: 'Un classique absolu ! Tarantino à son meilleur. L\'histoire non linéaire est brillante et les dialogues sont mémorables. Un must-see !'
  },
  {
    userEmail: 'marie@test.com',
    filmTitre: 'Le Parrain',
    note: 5,
    commentaire: 'Le film de gangsters par excellence. Marlon Brando et Al Pacino sont parfaits. Une œuvre intemporelle du cinéma.'
  },
  {
    userEmail: 'pierre@test.com',
    filmTitre: 'Les Évadés',
    note: 5,
    commentaire: 'Un film magnifique sur l\'espoir et l\'amitié. La performance de Morgan Freeman est exceptionnelle. Un film qui vous marque à vie.'
  },
  {
    userEmail: 'sophie@test.com',
    filmTitre: 'Forrest Gump',
    note: 4,
    commentaire: 'Un film touchant avec Tom Hanks au meilleur de sa forme. L\'histoire est émouvante et bien racontée. Un classique à voir absolument.'
  },
  {
    userEmail: 'lucas@test.com',
    filmTitre: 'Joker',
    note: 4,
    commentaire: 'Joaquin Phoenix est incroyable dans ce rôle. Un film sombre et puissant qui explore la folie. La réalisation est remarquable.'
  },
  {
    userEmail: 'marie@test.com',
    filmTitre: 'Cinema Paradiso',
    note: 5,
    commentaire: 'Un film magnifique sur l\'amour du cinéma. La musique d\'Ennio Morricone est sublime. Un film qui touche le cœur.'
  },
  {
    userEmail: 'pierre@test.com',
    filmTitre: 'Le Seigneur des Anneaux : Le Retour du Roi',
    note: 5,
    commentaire: 'La conclusion parfaite d\'une trilogie épique. Les effets spéciaux sont impressionnants et l\'histoire est captivante. Un chef-d\'œuvre !'
  },
  {
    userEmail: 'sophie@test.com',
    filmTitre: 'Schindler\'s List',
    note: 5,
    commentaire: 'Un film bouleversant et nécessaire. La réalisation de Spielberg est remarquable. Un film important qui doit être vu.'
  },
  {
    userEmail: 'lucas@test.com',
    filmTitre: 'GoodFellas',
    note: 5,
    commentaire: 'Scorsese à son meilleur ! Un film de gangsters brillant avec une réalisation impeccable. Les performances sont toutes excellentes.'
  }
];

async function createAccountsWithReviews() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'cineconnect',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    console.log('🔄 Création des comptes de test avec reviews...\n');

    // Créer les comptes
    for (const account of accounts) {
      try {
        const [existing] = await connection.execute(
          'SELECT id FROM users WHERE email = ?',
          [account.email]
        );

        if (existing.length > 0) {
          console.log(`⏭️  Compte ${account.email} existe déjà`);
          continue;
        }

        const passwordHash = await bcrypt.hash(account.password, 10);
        await connection.execute(
          'INSERT INTO users (email, password_hash, pseudo, bio) VALUES (?, ?, ?, ?)',
          [account.email, passwordHash, account.pseudo, account.bio]
        );

        console.log(`✅ Compte créé: ${account.email} (${account.pseudo})`);
      } catch (error) {
        console.error(`❌ Erreur pour ${account.email}:`, error.message);
      }
    }

    console.log('\n🔄 Création des reviews...\n');

    // Créer les reviews
    for (const reviewData of reviews) {
      try {
        // Récupérer l'utilisateur
        const [users] = await connection.execute(
          'SELECT id FROM users WHERE email = ?',
          [reviewData.userEmail]
        );

        if (users.length === 0) {
          console.log(`⏭️  Utilisateur ${reviewData.userEmail} non trouvé`);
          continue;
        }

        const userId = users[0].id;

        // Récupérer le film
        const [films] = await connection.execute(
          'SELECT id FROM films WHERE titre = ?',
          [reviewData.filmTitre]
        );

        if (films.length === 0) {
          console.log(`⏭️  Film "${reviewData.filmTitre}" non trouvé`);
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

        // Créer la review avec une date aléatoire récente
        const randomDaysAgo = Math.floor(Math.random() * 30); // Entre 0 et 30 jours
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - randomDaysAgo);

        await connection.execute(
          'INSERT INTO reviews (user_id, film_id, note, commentaire, created_at) VALUES (?, ?, ?, ?, ?)',
          [userId, filmId, reviewData.note, reviewData.commentaire, createdAt]
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
    console.log('\n📝 Comptes créés:');
    accounts.forEach(a => {
      console.log(`   - ${a.email} / ${a.password} (${a.pseudo})`);
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await connection.end();
  }
}

createAccountsWithReviews();

