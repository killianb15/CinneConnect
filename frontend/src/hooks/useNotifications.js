/**
 * Hook personnalisé pour gérer les notifications en temps réel via WebSocket
 */

import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getCurrentUser } from '../services/authService';

/**
 * Hook pour écouter les notifications en temps réel
 * @returns {Object} { hasNewNotifications, refreshNotifications }
 */
function useNotifications() {
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const socketRef = useRef(null);
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    // Se connecter au WebSocket
    const socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socketRef.current = socket;

    // Écouter les nouvelles notifications
    socket.on('new-notification', (data) => {
      console.log('Nouvelle notification reçue:', data);
      setHasNewNotifications(true);
      
      // Émettre un événement personnalisé pour forcer le rafraîchissement
      window.dispatchEvent(new CustomEvent('notification-updated'));
    });

    // Gérer les erreurs de connexion
    socket.on('connect_error', (error) => {
      console.error('Erreur de connexion WebSocket:', error);
    });

    // Nettoyer à la déconnexion
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [currentUser?.id]); // Utiliser currentUser?.id au lieu de currentUser pour éviter les re-renders inutiles

  const refreshNotifications = () => {
    setHasNewNotifications(false);
    window.dispatchEvent(new CustomEvent('notification-updated'));
  };

  return { hasNewNotifications, refreshNotifications };
}

export default useNotifications;

