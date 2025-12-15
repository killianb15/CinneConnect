/**
 * Script pour créer un compte de test admin
 * Usage: node scripts/createTestAccounts.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createTestAccounts() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'cineconnect',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    const password = '1234';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Compte admin
    const adminEmail = 'admin@test.com';
    const adminPseudo = 'AdminTest';

    // Vérifier si le compte admin existe déjà
    const [existingAdmin] = await connection.execute(
      'SELECT id, role FROM users WHERE email = ?',
      [adminEmail]
    );

    if (existingAdmin.length > 0) {
      // Mettre à jour le rôle et le mot de passe si le compte existe
      await connection.execute(
        'UPDATE users SET role = ?, password_hash = ? WHERE email = ?',
        ['admin', passwordHash, adminEmail]
      );
      console.log(`✅ Compte admin mis à jour: ${adminEmail} (mot de passe: ${password})`);
      console.log(`   Ancien rôle: ${existingAdmin[0].role} → Nouveau rôle: admin`);
    } else {
      // Créer le compte admin
      await connection.execute(
        'INSERT INTO users (email, password_hash, pseudo, role) VALUES (?, ?, ?, ?)',
        [adminEmail, passwordHash, adminPseudo, 'admin']
      );
      console.log(`✅ Compte admin créé: ${adminEmail} (mot de passe: ${password})`);
    }

    console.log('\n📋 Récapitulatif du compte admin:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👑 ADMIN:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Pseudo: ${adminPseudo}`);
    console.log(`   Mot de passe: ${password}`);
    console.log(`   Accès: Back Office Administrateur`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

createTestAccounts();

