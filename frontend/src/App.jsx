/**
 * Composant principal de l'application CinéConnect
 * Gère le routage et la structure de base de l'application
 */

import { Routes, Route } from 'react-router-dom'
import './App.css'

// Composants de pages
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import GroupsPage from './pages/GroupsPage'
import GroupDetailsPage from './pages/GroupDetailsPage'
import SearchMoviesPage from './pages/SearchMoviesPage'
import DiscoverProfilesPage from './pages/DiscoverProfilesPage'
import FilmDetailsPage from './pages/FilmDetailsPage'
import ModerationPage from './pages/ModerationPage'

// Composant de navigation en bas
import BottomNav from './components/BottomNav'

function App() {
  return (
    <div className="App">
      <Routes>
        {/* Page d'accueil avec formulaires de connexion/inscription */}
        <Route path="/" element={<HomePage />} />
        {/* Pages de profils et groupes */}
        <Route path="/profil/:userId" element={<ProfilePage />} />
        <Route path="/groupes" element={<GroupsPage />} />
        <Route path="/groupes/:groupId" element={<GroupDetailsPage />} />
        {/* Page de recherche de films */}
        <Route path="/recherche-films" element={<SearchMoviesPage />} />
        {/* Page pour parcourir les profils */}
        <Route path="/parcourir-profils" element={<DiscoverProfilesPage />} />
        {/* Page de détails d'un film */}
        <Route path="/films/:filmId" element={<FilmDetailsPage />} />
        {/* Page de modération (admin/moderateur) */}
        <Route path="/moderation" element={<ModerationPage />} />
      </Routes>
      {/* Menu de navigation en bas (mobile) */}
      <BottomNav />
    </div>
  )
}

export default App

