/**
 * Script pour initialiser la base de données à partir du fichier SQL
 * Usage: node scripts/initDatabase.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  let connection;
  
  try {
    // Créer la connexion MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true // Permet d'exécuter plusieurs requêtes SQL
    });

    // Créer la base de données si elle n'existe pas
    const dbName = process.env.DB_NAME || 'cineconnect';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Base de données '${dbName}' créée ou déjà existante`);

    // Sélectionner la base de données
    await connection.query(`USE \`${dbName}\``);
    console.log(`✅ Connexion à la base de données '${dbName}' établie`);

    // Lire le fichier SQL
    const sqlFile = path.join(__dirname, '..', 'database', 'init.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Exécuter le script SQL
    console.log('📝 Exécution du script SQL...');
    
    try {
      await connection.query(sql);
      console.log('✅ Base de données initialisée avec succès!');
      console.log('✅ Toutes les tables et index ont été créés.');
    } catch (error) {
      // Si l'erreur est liée à un index ou une table déjà existante, c'est OK
      if (error.code === 'ER_DUP_KEYNAME' || error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('✅ Base de données déjà initialisée (certains éléments existent déjà)');
        console.log('ℹ️  C\'est normal si vous exécutez le script plusieurs fois.');
      } else {
        // Pour les autres erreurs, les afficher
        throw error;
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Exécuter le script
initDatabase();

