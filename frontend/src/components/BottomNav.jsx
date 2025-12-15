/**
 * Composant de navigation en bas pour mobile
 * Menu responsive avec icônes
 */

import { Link, useLocation } from 'react-router-dom';
import { isAuthenticated, getCurrentUser, logout } from '../services/authService';
import './BottomNav.css';

function BottomNav() {
  const location = useLocation();
  const authenticated = isAuthenticated();
  const currentUser = getCurrentUser();

  // Ne pas afficher le menu si l'utilisateur n'est pas connecté
  if (!authenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <nav className="bottom-nav">
      <Link 
        to="/" 
        className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
      >
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Accueil</span>
      </Link>

      <Link 
        to="/groupes" 
        className={`nav-item ${location.pathname.startsWith('/groupes') ? 'active' : ''}`}
      >
        <span className="nav-icon">👥</span>
        <span className="nav-label">Groupes</span>
      </Link>

      <Link 
        to="/recherche-films" 
        className={`nav-item ${location.pathname === '/recherche-films' ? 'active' : ''}`}
      >
        <span className="nav-icon">🔍</span>
        <span className="nav-label">Recherche</span>
      </Link>

      {currentUser && (
        <Link 
          to={`/profil/${currentUser.id}`} 
          className={`nav-item ${location.pathname.startsWith('/profil') ? 'active' : ''}`}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-label">Profil</span>
        </Link>
      )}

      <button 
        onClick={handleLogout}
        className="nav-item nav-logout"
      >
        <span className="nav-icon">🚪</span>
        <span className="nav-label">Déconnexion</span>
      </button>
    </nav>
  );
}

export default BottomNav;

