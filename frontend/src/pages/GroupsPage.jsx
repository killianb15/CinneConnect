/**
 * Page de liste des groupes
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroups, createGroup } from '../services/groupService';
import './GroupsPage.css';

function GroupsPage() {
  const navigate = useNavigate();
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    thematique: '',
    isPublic: true
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await getGroups();
      setGroupes(data.groupes || []);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des groupes');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createGroup(formData);
      setShowCreateForm(false);
      setFormData({ titre: '', description: '', thematique: '', isPublic: true });
      loadGroups();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    }
  };

  return (
    <div className="groups-page">
      <div className="groups-container">
        <button onClick={() => navigate('/')} className="back-button">← Retour à l'accueil</button>
        <div className="groups-header">
          <h1>🎬 Groupes Thématiques</h1>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="create-btn">
            {showCreateForm ? 'Annuler' : '+ Créer un groupe'}
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleSubmit} className="create-group-form">
            <h2>Créer un nouveau groupe</h2>
            {error && <div className="error-message">{error}</div>}
            <div className="form-group">
              <label>Titre *</label>
              <input
                type="text"
                name="titre"
                value={formData.titre}
                onChange={handleChange}
                placeholder="Nom du groupe"
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description du groupe"
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Thématique</label>
              <input
                type="text"
                name="thematique"
                value={formData.thematique}
                onChange={handleChange}
                placeholder="Ex: Films d'horreur, Comédies..."
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleChange}
                />
                Groupe public
              </label>
            </div>
            <button type="submit" className="submit-button">Créer le groupe</button>
          </form>
        )}

        {loading ? (
          <div className="loading">Chargement des groupes...</div>
        ) : groupes.length === 0 ? (
          <div className="empty-state">Aucun groupe disponible</div>
        ) : (
          <div className="groups-grid">
            {groupes.map(group => (
              <div key={group.id} className="group-card" onClick={() => navigate(`/groupes/${group.id}`)}>
                {group.imageCouverture && (
                  <img src={group.imageCouverture} alt={group.titre} className="group-cover" />
                )}
                <div className="group-content">
                  <h3>{group.titre}</h3>
                  {group.description && <p className="group-description">{group.description}</p>}
                  {group.thematique && (
                    <span className="group-theme">{group.thematique}</span>
                  )}
                  <div className="group-meta">
                    <span>{group.nombreMembres} membres</span>
                    <span>{group.nombreFilms} films</span>
                    {group.userRole && (
                      <span className="user-role">Vous: {group.userRole}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupsPage;

