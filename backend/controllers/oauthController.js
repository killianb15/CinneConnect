

const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { pool } = require('../config/database');

const clientGoogle = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function genererJwt(utilisateur) {
    return jwt.sign(
        { userId: utilisateur.id, email: utilisateur.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

async function trouverPseudoDisponible(pseudoBase) {
    let pseudo = (pseudoBase || 'utilisateur').trim();
    if (pseudo.length < 3) pseudo = 'utilisateur';
    if (pseudo.length > 100) pseudo = pseudo.slice(0, 100);

    for (let i = 0; i < 10; i++) {
        const candidat = i === 0 ? pseudo : `${pseudo}-${Math.floor(Math.random() * 10000)}`;
        const [existant] = await pool.execute('SELECT id FROM users WHERE pseudo = ?', [candidat]);
        if (existant.length === 0) return candidat;
    }
    return `utilisateur-${Date.now()}`;
}

async function loginGoogle(req, res) {
    try {
        const { credential } = req.body;

        if (!credential) return res.status(400).json({ error: 'credential manquant' });
        if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'GOOGLE_CLIENT_ID manquant' });

        const ticket = await clientGoogle.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const googleId = payload?.sub;
        const email = payload?.email;
        const emailVerifie = payload?.email_verified;
        const nom = payload?.name;
        const photoUrl = payload?.picture;

        if (!googleId || !email) return res.status(401).json({ error: 'Token Google invalide' });
        if (!emailVerifie) return res.status(401).json({ error: 'Email Google non vérifié' });

        // 1) Déjà lié à Google ?
        const [usersOauth] = await pool.execute(
            'SELECT id, email, pseudo, photo_url, bio, role, genres_preferences, oauth_provider FROM users WHERE oauth_provider = ? AND oauth_id = ?',
            ['google', googleId]
        );
        let user = usersOauth[0];

        // 2) Sinon, liaison par email si le compte existe déjà
        if (!user) {
            const [usersEmail] = await pool.execute(
                'SELECT id, email, pseudo, photo_url, bio, role, genres_preferences, oauth_provider FROM users WHERE email = ?',
                [email]
            );

            if (usersEmail.length > 0) {
                const existant = usersEmail[0];

                if (existant.oauth_provider && existant.oauth_provider !== 'google') {
                    return res.status(409).json({
                        error: 'Compte déjà lié',
                        message: 'Ce compte est déjà lié à un autre fournisseur.'
                    });
                }

                await pool.execute(
                    'UPDATE users SET oauth_provider = ?, oauth_id = ?, is_email_verified = TRUE, photo_url = COALESCE(photo_url, ?) WHERE id = ?',
                    ['google', googleId, photoUrl || null, existant.id]
                );

                user = { ...existant, photo_url: existant.photo_url || photoUrl || null };
            }
        }

        // 3) Sinon, création
        if (!user) {
            const pseudoBase = nom || (email.includes('@') ? email.split('@')[0] : 'utilisateur');
            const pseudoFinal = await trouverPseudoDisponible(pseudoBase);

            const [insert] = await pool.execute(
                `INSERT INTO users (email, password_hash, pseudo, photo_url, oauth_provider, oauth_id, is_email_verified)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
                [email, null, pseudoFinal, photoUrl || null, 'google', googleId]
            );

            const [created] = await pool.execute(
                'SELECT id, email, pseudo, photo_url, bio, role, genres_preferences FROM users WHERE id = ?',
                [insert.insertId]
            );

            user = created[0];
        }

        let genresPreferences = [];
        if (user.genres_preferences) {
            try {
                genresPreferences = typeof user.genres_preferences === 'string'
                    ? JSON.parse(user.genres_preferences)
                    : user.genres_preferences;
            } catch {
                genresPreferences = [];
            }
        }

        const token = genererJwt(user);

        return res.json({
            message: 'Connexion Google réussie',
            token,
            user: {
                id: user.id,
                email: user.email,
                pseudo: user.pseudo,
                photoUrl: user.photo_url,
                bio: user.bio,
                role: user.role,
                genresPreferences
            }
        });
    } catch (error) {
        console.error('Erreur OAuth Google:', error);
        return res.status(500).json({ error: 'Erreur serveur', message: 'Connexion Google impossible' });
    }
}

module.exports = { loginGoogle };
