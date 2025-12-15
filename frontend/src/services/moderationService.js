/**
 * Service pour la modération du contenu
 */

import api from './api';

/**
 * Signale un contenu
 */
export const reportContent = async (contentType, contentId, reason) => {
  const response = await api.post('/moderation/report', {
    contentType,
    contentId,
    reason
  });
  return response.data;
};

/**
 * Récupère la liste des signalements (modérateurs/admins)
 */
export const getReports = async (status = 'pending') => {
  const response = await api.get('/moderation/reports', {
    params: { status }
  });
  return response.data;
};

/**
 * Traite un signalement
 */
export const handleReport = async (reportId, action, notes) => {
  const response = await api.post(`/moderation/reports/${reportId}/action`, {
    action,
    notes
  });
  return response.data;
};

