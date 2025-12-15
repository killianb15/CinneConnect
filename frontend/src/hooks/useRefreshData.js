/**
 * Hook personnalisé pour gérer le rafraîchissement des données avec Ctrl+Shift+R
 * @param {Function} refreshCallback - Fonction à appeler pour rafraîchir les données
 */
import { useEffect } from 'react';

export default function useRefreshData(refreshCallback) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Détecter Ctrl+Shift+R
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault(); // Empêcher le rechargement par défaut du navigateur
        if (refreshCallback && typeof refreshCallback === 'function') {
          refreshCallback();
        }
      }
    };

    // Ajouter l'écouteur d'événements
    window.addEventListener('keydown', handleKeyDown);

    // Nettoyer l'écouteur lors du démontage
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [refreshCallback]);
}

