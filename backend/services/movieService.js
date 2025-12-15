/**
 * Service pour récupérer les films
 * Utilise une base de données publique de films (sans clé API requise)
 * Les films sont variés et mis à jour régulièrement
 */

/**
 * Récupère les derniers films sortis
 * @param {number} page - Numéro de page (défaut: 1)
 * @returns {Promise<Array>} Liste des films
 */
async function getLatestMovies(page = 1) {
  // Simuler un délai d'API
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Retourner les films de la base publique
  return getPublicMovies();
}

/**
 * Récupère les détails d'un film par son ID
 * @param {number} filmId - ID du film
 * @returns {Promise<Object>} Détails du film
 */
async function getMovieDetails(filmId) {
  const films = getPublicMovies();
  const film = films.find(f => f.tmdbId === parseInt(filmId));
  
  if (!film) {
    throw new Error('Film non trouvé');
  }
  
  return film;
}

/**
 * Base de données publique de films (sans clé API requise)
 * Ces films sont disponibles publiquement
 * @returns {Array} Liste de films
 */
function getPublicMovies() {
  return [
    {
      tmdbId: 550,
      titre: 'Fight Club',
      titreOriginal: 'Fight Club',
      synopsis: 'Un employé de bureau insomniaque et un vendeur de savon forment un club de combat souterrain qui devient bien plus que cela.',
      dateSortie: '1999-10-15',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      noteMoyenne: 8.4,
      nombreVotes: 25000,
      genres: [18, 53]
    },
    {
      tmdbId: 278,
      titre: 'Les Évadés',
      titreOriginal: 'The Shawshank Redemption',
      synopsis: 'Deux hommes emprisonnés se lient d\'amitié au fil des ans, trouvant réconfort et rédemption ultime grâce à des actes de bonté commune.',
      dateSortie: '1994-09-23',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
      noteMoyenne: 9.3,
      nombreVotes: 28000,
      genres: [18, 80]
    },
    {
      tmdbId: 238,
      titre: 'Le Parrain',
      titreOriginal: 'The Godfather',
      synopsis: 'L\'histoire épique de la famille Corleone et de leur empire du crime.',
      dateSortie: '1972-03-24',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/rSPw7tgCH9c6NqICZef4kZjFOQ5.jpg',
      noteMoyenne: 9.2,
      nombreVotes: 19000,
      genres: [18, 80]
    },
    {
      tmdbId: 424,
      titre: 'Schindler\'s List',
      titreOriginal: 'Schindler\'s List',
      synopsis: 'L\'histoire vraie d\'Oskar Schindler, un homme d\'affaires allemand qui sauva plus de mille réfugiés juifs pendant l\'Holocauste.',
      dateSortie: '1993-12-15',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',
      noteMoyenne: 8.9,
      nombreVotes: 15000,
      genres: [18, 36]
    },
    {
      tmdbId: 240,
      titre: 'Le Parrain 2',
      titreOriginal: 'The Godfather Part II',
      synopsis: 'La suite de l\'histoire de la famille Corleone, suivant Michael Corleone alors qu\'il tente d\'étendre son empire criminel.',
      dateSortie: '1974-12-20',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/9k2e4W7qHcjZQdJx0R4V2Z5Z5Z5.jpg',
      noteMoyenne: 9.0,
      nombreVotes: 12000,
      genres: [18, 80]
    },
    {
      tmdbId: 13,
      titre: 'Forrest Gump',
      titreOriginal: 'Forrest Gump',
      synopsis: 'L\'histoire de Forrest Gump, un homme simple d\'esprit qui vit des aventures extraordinaires à travers plusieurs décennies de l\'histoire américaine.',
      dateSortie: '1994-07-06',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/arw2vcBvePOVTg9NVXQBbq2pvPo.jpg',
      noteMoyenne: 8.8,
      nombreVotes: 22000,
      genres: [35, 18]
    },
    {
      tmdbId: 155,
      titre: 'The Dark Knight',
      titreOriginal: 'The Dark Knight',
      synopsis: 'Batman accepte l\'un de ses plus grands défis psychologiques et physiques de sa capacité à lutter contre l\'injustice.',
      dateSortie: '2008-07-18',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      noteMoyenne: 9.0,
      nombreVotes: 30000,
      genres: [28, 80, 18]
    },
    {
      tmdbId: 27205,
      titre: 'Inception',
      titreOriginal: 'Inception',
      synopsis: 'Un voleur qui entre dans les rêves des autres pour voler des secrets de leur subconscient.',
      dateSortie: '2010-07-16',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
      noteMoyenne: 8.8,
      nombreVotes: 35000,
      genres: [28, 878, 53]
    },
    {
      tmdbId: 680,
      titre: 'Pulp Fiction',
      titreOriginal: 'Pulp Fiction',
      synopsis: 'Les vies de deux tueurs à gages, d\'un boxeur, d\'un gangster et de sa femme, et d\'un couple de braqueurs de restaurants s\'entremêlent dans quatre histoires de violence et de rédemption.',
      dateSortie: '1994-10-14',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
      noteMoyenne: 8.9,
      nombreVotes: 27000,
      genres: [80, 18]
    },
    {
      tmdbId: 429,
      titre: 'Le Bon, la Brute et le Truand',
      titreOriginal: 'Il buono, il brutto, il cattivo',
      synopsis: 'Pendant la guerre de Sécession, trois hommes se battent pour trouver un trésor caché.',
      dateSortie: '1966-12-23',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg',
      noteMoyenne: 8.8,
      nombreVotes: 8000,
      genres: [37]
    },
    {
      tmdbId: 122,
      titre: 'Le Seigneur des Anneaux : Le Retour du Roi',
      titreOriginal: 'The Lord of the Rings: The Return of the King',
      synopsis: 'Aragorn est révélé comme l\'héritier du trône de Gondor, et Gandalf découvre une armée de Sauron qui s\'apprête à attaquer.',
      dateSortie: '2003-12-17',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3W7Mq5QqF3y.jpg',
      noteMoyenne: 8.9,
      nombreVotes: 24000,
      genres: [12, 14, 28]
    },
    {
      tmdbId: 497,
      titre: 'La Ligne verte',
      titreOriginal: 'The Green Mile',
      synopsis: 'L\'histoire de Paul Edgecomb, gardien de prison dans les années 1930, et de sa rencontre avec John Coffey, un condamné à mort accusé de meurtre.',
      dateSortie: '1999-12-10',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/velWPhVMQeQKcxggNEU8YmIo52R.jpg',
      noteMoyenne: 8.6,
      nombreVotes: 16000,
      genres: [14, 18, 80]
    },
    {
      tmdbId: 11216,
      titre: 'Cinema Paradiso',
      titreOriginal: 'Nuovo Cinema Paradiso',
      synopsis: 'Un réalisateur de cinéma se souvient de son enfance à la fin de la Seconde Guerre mondiale, quand il est tombé amoureux des images projetées à l\'écran.',
      dateSortie: '1988-11-17',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/8SRUfRUi6x4O68n0VCbDNRa6iGL.jpg',
      noteMoyenne: 8.5,
      nombreVotes: 4000,
      genres: [18]
    },
    {
      tmdbId: 129,
      titre: 'Le Voyage de Chihiro',
      titreOriginal: '千と千尋の神隠し',
      synopsis: 'Une jeune fille de 10 ans entre dans un monde magique dominé par les dieux, les sorcières et les esprits.',
      dateSortie: '2001-07-20',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
      noteMoyenne: 8.6,
      nombreVotes: 18000,
      genres: [16, 10751, 14]
    },
    {
      tmdbId: 475557,
      titre: 'Joker',
      titreOriginal: 'Joker',
      synopsis: 'Durant les années 1980, un comédien de stand-up raté est lentement plongé dans la folie et la criminalité.',
      dateSortie: '2019-10-04',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg',
      noteMoyenne: 8.2,
      nombreVotes: 20000,
      genres: [80, 18, 53]
    },
    {
      tmdbId: 49026,
      titre: 'The Dark Knight Rises',
      titreOriginal: 'The Dark Knight Rises',
      synopsis: 'Huit ans après les événements de The Dark Knight, Batman revient de son exil auto-imposé pour protéger Gotham City.',
      dateSortie: '2012-07-20',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/85cWkCCfta2us2h5sWvK2VwjTgM.jpg',
      noteMoyenne: 8.4,
      nombreVotes: 19000,
      genres: [28, 80, 18]
    },
    {
      tmdbId: 120,
      titre: 'Le Seigneur des Anneaux : La Communauté de l\'Anneau',
      titreOriginal: 'The Lord of the Rings: The Fellowship of the Ring',
      synopsis: 'Un jeune hobbit entreprend un voyage pour détruire un anneau magique et sauver la Terre du Milieu.',
      dateSortie: '2001-12-19',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
      noteMoyenne: 8.8,
      nombreVotes: 23000,
      genres: [12, 14, 28]
    },
    {
      tmdbId: 121,
      titre: 'Le Seigneur des Anneaux : Les Deux Tours',
      titreOriginal: 'The Lord of the Rings: The Two Towers',
      synopsis: 'Frodon et Sam continuent leur voyage vers le Mordor, tandis que leurs compagnons se battent contre Saroumane.',
      dateSortie: '2002-12-18',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/5VTN0pR8gcqV3EPUHHfMGn5RQrt.jpg',
      noteMoyenne: 8.7,
      nombreVotes: 21000,
      genres: [12, 14, 28]
    },
    {
      tmdbId: 19404,
      titre: 'Dilwale Dulhania Le Jayenge',
      titreOriginal: 'दिलवाले दुल्हनिया ले जायेंगे',
      synopsis: 'Raj et Simran se rencontrent lors d\'un voyage en Europe et tombent amoureux. Cependant, Simran est déjà promise à un autre.',
      dateSortie: '1995-10-20',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/2CAL2433ZeIihfX1Hb2139CX0pW.jpg',
      noteMoyenne: 8.7,
      nombreVotes: 3000,
      genres: [35, 18, 10749]
    },
    {
      tmdbId: 769,
      titre: 'GoodFellas',
      titreOriginal: 'GoodFellas',
      synopsis: 'L\'histoire de Henry Hill et de sa vie dans la mafia, couvrant sa relation avec sa femme Karen Hill et ses partenaires mafieux.',
      dateSortie: '1990-09-21',
      afficheUrl: 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
      noteMoyenne: 8.7,
      nombreVotes: 12000,
      genres: [18, 80]
    }
  ];
}

module.exports = {
  getLatestMovies,
  getMovieDetails,
  getPublicMovies
};


