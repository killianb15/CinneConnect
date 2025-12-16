/**
 * Modal pour la connexion et l'inscription
 */
import { GoogleLogin } from '@react-oauth/google';
import { login, register, loginWithGoogle } from '../services/authService';
import { useState } from 'react';
import { login as loginBis, register as registerBis } from '../services/authService';
import './AuthModal.css';

function AuthModal({ isOpen, onClose, onSuccess }) {
    const [activeTab, setActiveTab] = useState('login');
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [registerData, setRegisterData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        pseudo: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ici je garde votre double import sans le supprimer, mais je l'utilise pour éviter les erreurs/avertissements
    void loginBis;
    void registerBis;

    if (!isOpen) return null;

    const handleLoginChange = (e) => {
        setLoginData({ ...loginData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(loginData);
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterChange = (e) => {
        setRegisterData({ ...registerData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register({
                email: registerData.email,
                password: registerData.password,
                pseudo: registerData.pseudo
            });
            onSuccess();
            onClose();
        } catch (err) {
            if (err.response?.data?.details) {
                setError(err.response.data.details.map(d => d.msg).join(', '));
            } else {
                setError(err.response?.data?.message || err.response?.data?.error || 'Erreur d\'inscription');
            }
        } finally {
            setLoading(false);
        }
    };

    // ==========================
    // AJOUT : Authentification Google
    // ==========================
    const handleGoogleSuccess = async (credentialResponse) => {
        setError('');
        setLoading(true);
        try {
            const credential = credentialResponse?.credential;
            if (!credential) {
                setError('Token Google manquant.');
                return;
            }

            await loginWithGoogle(credential);
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Erreur de connexion Google');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = () => {
        setError('Connexion Google annulée ou impossible.');
    };
    // ==========================

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <button className="auth-modal-close" onClick={onClose}>✕</button>

                <div className="auth-modal-header">
                    <h2>🎬 CinéConnect</h2>
                    <p>Rejoignez la communauté cinéphile</p>
                </div>

                <div className="auth-modal-tabs">
                    <button
                        className={activeTab === 'login' ? 'active' : ''}
                        onClick={() => { setActiveTab('login'); setError(''); }}
                    >
                        Connexion
                    </button>
                    <button
                        className={activeTab === 'register' ? 'active' : ''}
                        onClick={() => { setActiveTab('register'); setError(''); }}
                    >
                        Inscription
                    </button>
                </div>

                {error && <div className="auth-modal-error">{error}</div>}

                {/* AJOUT : Bouton Google */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                    <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
                </div>

                {activeTab === 'login' && (
                    <form onSubmit={handleLoginSubmit} className="auth-modal-form">
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="text"
                                name="email"
                                value={loginData.email}
                                onChange={handleLoginChange}
                                placeholder="votre@email.com"
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label>Mot de passe</label>
                            <input
                                type="password"
                                name="password"
                                value={loginData.password}
                                onChange={handleLoginChange}
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>
                        <button type="submit" className="auth-modal-submit" disabled={loading}>
                            {loading ? 'Connexion...' : 'Se connecter'}
                        </button>
                    </form>
                )}

                {activeTab === 'register' && (
                    <form onSubmit={handleRegisterSubmit} className="auth-modal-form">
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="text"
                                name="email"
                                value={registerData.email}
                                onChange={handleRegisterChange}
                                placeholder="votre@email.com"
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label>Pseudo</label>
                            <input
                                type="text"
                                name="pseudo"
                                value={registerData.pseudo}
                                onChange={handleRegisterChange}
                                placeholder="Votre pseudo"
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label>Mot de passe</label>
                            <input
                                type="password"
                                name="password"
                                value={registerData.password}
                                onChange={handleRegisterChange}
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirmer le mot de passe</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={registerData.confirmPassword}
                                onChange={handleRegisterChange}
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>
                        <button type="submit" className="auth-modal-submit" disabled={loading}>
                            {loading ? 'Inscription...' : 'S\'inscrire'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default AuthModal;
