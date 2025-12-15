/**
 * Hook personnalisé pour debounce une valeur
 * Utile pour limiter le nombre de requêtes lors de la recherche
 */

import { useState, useEffect } from 'react';

/**
 * Retourne une valeur debouncée
 * @param {any} value - La valeur à debouncer
 * @param {number} delay - Délai en millisecondes (défaut: 500ms)
 * @returns {any} La valeur debouncée
 */
function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Créer un timer qui met à jour la valeur debouncée après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timer si la valeur change avant la fin du délai
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;

