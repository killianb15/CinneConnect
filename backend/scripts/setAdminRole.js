/**
 * Script pour attribuer le rôle admin ou modérateur à un utilisateur
 * Usage: node scripts/setAdminRole.js <email> <role>
 * Exemple: node scripts/setAdminRole.js admin@example.com admin
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function setUserRole() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node scripts/setAdminRole.js <email> <role>');
    console.log('Rôles disponibles: admin, moderateur, membre');
    process.exit(1);
  }

  const [email, role] = args;

  if (!['admin', 'moderateur', 'membre'].includes(role)) {
    console.error('❌ Rôle invalide. Rôles disponibles: admin, moderateur, membre');
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'cineconnect',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    // Vérifier que l'utilisateur existe
    const [users] = await connection.execute(
      'SELECT id, pseudo, role FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      console.error(`❌ Utilisateur avec l'email "${email}" non trouvé`);
      process.exit(1);
    }

    const user = users[0];

    // Mettre à jour le rôle
    await connection.execute(
      'UPDATE users SET role = ? WHERE email = ?',
      [role, email]
    );

    console.log(`✅ Rôle "${role}" attribué à ${user.pseudo} (${email})`);
    console.log(`   Ancien rôle: ${user.role}`);
    console.log(`   Nouveau rôle: ${role}`);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

setUserRole();

