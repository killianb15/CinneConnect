/**
 * Back Office Administrateur
 * Permet de voir et traiter les signalements de contenu
 * Accessible uniquement aux administrateurs
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReports, handleReport } from '../services/moderationService';
import { getCurrentUser } from '../services/authService';
import useRefreshData from '../hooks/useRefreshData';
import './ModerationPage.css';

function ModerationPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [actionNotes, setActionNotes] = useState({});
  const [allReports, setAllReports] = useState([]); // Pour les statistiques

  // Fonction pour rafraîchir toutes les données
  const refreshAllData = () => {
    if (currentUser && currentUser.role === 'admin') {
      loadReports();
      loadAllReportsForStats();
    }
  };

  // Vérifier que l'utilisateur est admin
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/');
      return;
    }
    refreshAllData();
  }, [statusFilter]);

  // Gérer le raccourci Ctrl+Shift+R pour rafraîchir les données
  useRefreshData(refreshAllData);

  const loadAllReportsForStats = async () => {
    try {
      // Charger tous les signalements pour les statistiques
      const [pending, resolved, reviewed, dismissed] = await Promise.all([
        getReports('pending').catch(() => ({ reports: [] })),
        getReports('resolved').catch(() => ({ reports: [] })),
        getReports('reviewed').catch(() => ({ reports: [] })),
        getReports('dismissed').catch(() => ({ reports: [] }))
      ]);
      setAllReports([
        ...pending.reports,
        ...resolved.reports,
        ...reviewed.reports,
        ...dismissed.reports
      ]);
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getReports(statusFilter);
      setReports(data.reports || []);
    } catch (err) {
      console.error('Erreur lors du chargement des signalements:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des signalements');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (reportId, action) => {
    setActionLoading(prev => ({ ...prev, [reportId]: true }));
    try {
      const notes = actionNotes[reportId] || '';
      await handleReport(reportId, action, notes);
      await loadReports(); // Recharger la liste
      setActionNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[reportId];
        return newNotes;
      });
      setSelectedReport(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du traitement du signalement');
    } finally {
      setActionLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const getContentPreview = (report) => {
    if (!report.content) {
      return 'Contenu supprimé ou introuvable';
    }

    switch (report.contentType) {
      case 'review':
        return `Review sur "${report.content.filmTitre}" par ${report.content.userPseudo}`;
      case 'comment_reply':
        return `Réponse de ${report.content.userPseudo}`;
      case 'group_message':
        return `Message dans "${report.content.groupeTitre}" par ${report.content.userPseudo}`;
      case 'user':
        return `Profil de ${report.content.pseudo}`;
      default:
        return 'Contenu';
    }
  };

  const renderContentPreview = (report) => {
    if (!report.content) {
      return <div className="content-preview deleted">Contenu supprimé ou introuvable</div>;
    }

    switch (report.contentType) {
      case 'review':
        return (
          <div className="content-preview">
            <div className="content-header">
              <strong>Film:</strong> {report.content.filmTitre}
              <br />
              <strong>Auteur:</strong> {report.content.userPseudo}
            </div>
            {report.content.note && (
              <div className="content-note">Note: {report.content.note}/5</div>
            )}
            {report.content.commentaire && (
              <div className="content-text">"{report.content.commentaire}"</div>
            )}
          </div>
        );
      case 'comment_reply':
        return (
          <div className="content-preview">
            <div className="content-header">
              <strong>Auteur:</strong> {report.content.userPseudo}
            </div>
            <div className="content-text">"{report.content.message}"</div>
          </div>
        );
      case 'group_message':
        return (
          <div className="content-preview">
            <div className="content-header">
              <strong>Groupe:</strong> {report.content.groupeTitre}
              <br />
              <strong>Auteur:</strong> {report.content.userPseudo}
            </div>
            <div className="content-text">"{report.content.message}"</div>
          </div>
        );
      case 'user':
        return (
          <div className="content-preview">
            <div className="content-header">
              <strong>Pseudo:</strong> {report.content.pseudo}
              <br />
              <strong>Email:</strong> {report.content.email}
            </div>
            {report.content.bio && (
              <div className="content-text">Bio: {report.content.bio}</div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'delete':
        return 'Supprimer';
      case 'warn':
        return 'Avertir';
      case 'ban':
        return 'Bannir';
      case 'no_action':
        return 'Ignorer';
      default:
        return action;
    }
  };

  if (loading) {
    return (
      <div className="moderation-page">
        <div className="loading">Chargement des signalements...</div>
      </div>
    );
  }

  return (
    <div className="moderation-page">
      <div className="moderation-container">
        <div className="moderation-header">
          <h1>🛡️ Back Office Administrateur</h1>
          <button onClick={() => navigate(-1)} className="back-button">← Retour</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Statistiques rapides */}
        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-info">
                <div className="stat-label">En attente</div>
                <div className="stat-value">{allReports.filter(r => r.status === 'pending').length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <div className="stat-label">Résolus</div>
                <div className="stat-value">{allReports.filter(r => r.status === 'resolved').length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👀</div>
              <div className="stat-info">
                <div className="stat-label">En cours</div>
                <div className="stat-value">{allReports.filter(r => r.status === 'reviewed').length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">❌</div>
              <div className="stat-info">
                <div className="stat-label">Rejetés</div>
                <div className="stat-value">{allReports.filter(r => r.status === 'dismissed').length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="filters-section">
          <h2>Filtres</h2>
          <div className="filter-buttons">
            <button
              className={statusFilter === 'pending' ? 'active' : ''}
              onClick={() => setStatusFilter('pending')}
            >
              En attente
            </button>
            <button
              className={statusFilter === 'resolved' ? 'active' : ''}
              onClick={() => setStatusFilter('resolved')}
            >
              Résolus
            </button>
            <button
              className={statusFilter === 'reviewed' ? 'active' : ''}
              onClick={() => setStatusFilter('reviewed')}
            >
              En cours
            </button>
            <button
              className={statusFilter === 'dismissed' ? 'active' : ''}
              onClick={() => setStatusFilter('dismissed')}
            >
              Rejetés
            </button>
          </div>
        </div>

        {/* Liste des signalements */}
        <div className="reports-section">
          <h2>Gestion des Signalements ({reports.length})</h2>
          {reports.length === 0 ? (
            <div className="empty-state">
              <p>📭 Aucun signalement {statusFilter === 'pending' ? 'en attente' : `avec le statut "${statusFilter}"`}</p>
            </div>
          ) : (
            <div className="reports-list">
              {reports.map(report => (
                <div key={report.id} className="report-card">
                  <div className="report-header">
                    <div className="report-info">
                      <div className="report-type">
                        <strong>Type:</strong> {getContentPreview(report)}
                      </div>
                      <div className="report-reporter">
                        <strong>Signalé par:</strong> {report.reporter.pseudo}
                      </div>
                      <div className="report-date">
                        <strong>Date:</strong> {new Date(report.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {report.reason && (
                        <div className="report-reason">
                          <strong>Raison:</strong> {report.reason}
                        </div>
                      )}
                      {/* Aperçu du contenu signalé */}
                      <div className="content-preview-section">
                        <strong>Contenu signalé:</strong>
                        {renderContentPreview(report)}
                      </div>
                      {report.moderator && (
                        <div className="report-moderator">
                          <strong>Traité par:</strong> {report.moderator.pseudo}
                          {report.moderatorAction && (
                            <span className="action-badge">{getActionLabel(report.moderatorAction)}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="report-status">
                      <span className={`status-badge status-${report.status}`}>
                        {report.status === 'pending' && '⏳ En attente'}
                        {report.status === 'resolved' && '✅ Résolu'}
                        {report.status === 'reviewed' && '👀 En cours'}
                        {report.status === 'dismissed' && '❌ Rejeté'}
                      </span>
                    </div>
                  </div>

                  {/* Actions pour les signalements en attente */}
                  {report.status === 'pending' && (
                    <div className="report-actions">
                      <div className="action-buttons">
                        <button
                          onClick={() => handleAction(report.id, 'delete')}
                          className="action-btn delete-btn"
                          disabled={actionLoading[report.id]}
                        >
                          {actionLoading[report.id] ? '...' : '🗑️ Supprimer le contenu'}
                        </button>
                        <button
                          onClick={() => handleAction(report.id, 'warn')}
                          className="action-btn warn-btn"
                          disabled={actionLoading[report.id]}
                        >
                          {actionLoading[report.id] ? '...' : '⚠️ Avertir'}
                        </button>
                        <button
                          onClick={() => handleAction(report.id, 'ban')}
                          className="action-btn ban-btn"
                          disabled={actionLoading[report.id]}
                        >
                          {actionLoading[report.id] ? '...' : '🚫 Bannir'}
                        </button>
                        <button
                          onClick={() => handleAction(report.id, 'no_action')}
                          className="action-btn ignore-btn"
                          disabled={actionLoading[report.id]}
                        >
                          {actionLoading[report.id] ? '...' : '✓ Ignorer'}
                        </button>
                      </div>
                      <div className="action-notes">
                        <label>Notes (optionnel):</label>
                        <textarea
                          value={actionNotes[report.id] || ''}
                          onChange={(e) => setActionNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                          placeholder="Ajouter des notes sur cette action..."
                          rows={2}
                        />
                      </div>
                    </div>
                  )}

                  {/* Afficher les notes du modérateur si disponibles */}
                  {report.moderatorNotes && (
                    <div className="moderator-notes">
                      <strong>Notes du modérateur:</strong> {report.moderatorNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModerationPage;

