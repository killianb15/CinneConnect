/**
 * Page d'inscription
 * Permet aux nouveaux utilisateurs de créer un compte
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/authService';
import './Auth.css';

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    pseudo: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Effacer l'erreur quand l'utilisateur tape
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation côté client
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);

    try {
      // Envoyer seulement email, password et pseudo au backend
      await register({
        email: formData.email,
        password: formData.password,
        pseudo: formData.pseudo
      });
      // Rediriger vers la page d'accueil après inscription réussie
      navigate('/');
    } catch (err) {
      // Gérer les erreurs de validation du backend
      if (err.response?.data?.details) {
        const details = err.response.data.details;
        setError(details.map(d => d.msg).join(', '));
      } else {
        setError(
          err.response?.data?.message || 
          err.response?.data?.error || 
          'Une erreur est survenue lors de l\'inscription'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🎬 Inscription</h1>
        <p className="auth-subtitle">Rejoignez la communauté CinéConnect</p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="votre@email.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="pseudo">Pseudo</label>
            <input
              type="text"
              id="pseudo"
              name="pseudo"
              value={formData.pseudo}
              onChange={handleChange}
              required
              minLength="3"
              maxLength="100"
              placeholder="Votre pseudo"
              disabled={loading}
            />
            <small>3 à 100 caractères (lettres, chiffres, tirets, underscores)</small>
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="8"
              placeholder="Au moins 8 caractères"
              disabled={loading}
            />
            <small>Au moins 8 caractères avec majuscule, minuscule et chiffre</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Répétez votre mot de passe"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Inscription...' : 'S\'inscrire'}
          </button>
        </form>

        <div className="auth-links">
          <span>Déjà un compte ? <Link to="/login">Se connecter</Link></span>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;


