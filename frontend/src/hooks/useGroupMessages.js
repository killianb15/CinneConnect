/**
 * Hook personnalisé pour gérer les messages de groupe via WebSocket
 */

import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getGroupMessages } from '../services/groupMessageService';
import { getCurrentUser } from '../services/authService';

/**
 * Hook pour gérer les messages d'un groupe en temps réel
 * @param {number} groupId - ID du groupe
 * @returns {Object} { messages, loading, error }
 */
function useGroupMessages(groupId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!groupId) return;

    // Charger les messages initiaux
    const loadInitialMessages = async () => {
      try {
        setLoading(true);
        const data = await getGroupMessages(groupId);
        setMessages(data.messages || []);
        setError(null);
      } catch (err) {
        console.error('Erreur lors du chargement des messages:', err);
        setError(err.response?.data?.error || 'Erreur lors du chargement des messages');
      } finally {
        setLoading(false);
      }
    };

    loadInitialMessages();

    // Se connecter au WebSocket
    const socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socketRef.current = socket;

    // Rejoindre la room du groupe
    socket.emit('join-group', groupId);

    // Écouter les nouveaux messages
    socket.on('new-message', (newMessage) => {
      setMessages((prevMessages) => {
        // Éviter les doublons
        if (prevMessages.some(msg => msg.id === newMessage.id)) {
          return prevMessages;
        }
        return [...prevMessages, newMessage];
      });
    });

    // Gérer les erreurs de connexion
    socket.on('connect_error', (err) => {
      console.error('Erreur de connexion WebSocket:', err);
    });

    socket.on('disconnect', () => {
      console.log('Déconnecté du serveur WebSocket');
    });

    // Nettoyage lors du démontage
    return () => {
      socket.emit('leave-group', groupId);
      socket.disconnect();
    };
  }, [groupId]);

  return { messages, loading, error };
}

export default useGroupMessages;

