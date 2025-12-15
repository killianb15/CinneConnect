import { useEffect, useState } from 'react';
import { getNotifications, markNotificationAsRead } from '../services/notificationService';
import { getFriendRequests, acceptFriendRequest, rejectFriendRequest } from '../services/friendService';
import { getGroupInvitations, acceptGroupInvitation, rejectGroupInvitation } from '../services/groupService';
import './NotificationBell.css';

function NotificationBell({ onGroupAccepted }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [groupInvites, setGroupInvites] = useState([]);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const unreadCount = groupInvites.length + friendRequests.length + (notifications?.filter(n => !n.isLu).length || 0);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [notifRes, friendsRes, invitesRes] = await Promise.all([
        getNotifications(),
        getFriendRequests(),
        getGroupInvitations()
      ]);
      setNotifications(notifRes.notifications || []);
      setFriendRequests(friendsRes.requests || []);
      setGroupInvites(invitesRes.invitations || []);
    } catch (err) {
      console.error('Erreur lors du chargement des notifications:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptFriend = async (userId) => {
    try {
      setProcessing(true);
      await acceptFriendRequest(userId);
      setFriendRequests((prev) => prev.filter((r) => r.requester.id !== userId));
    } catch (err) {
      console.error('Erreur acceptation ami:', err);
      setError(err.response?.data?.error || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectFriend = async (userId) => {
    try {
      setProcessing(true);
      await rejectFriendRequest(userId);
      setFriendRequests((prev) => prev.filter((r) => r.requester.id !== userId));
    } catch (err) {
      console.error('Erreur refus ami:', err);
      setError(err.response?.data?.error || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const handleAcceptGroup = async (invitationId, groupId) => {
    try {
      setProcessing(true);
      await acceptGroupInvitation(invitationId);
      setGroupInvites((prev) => prev.filter((i) => i.id !== invitationId));
      if (onGroupAccepted) onGroupAccepted(groupId);
    } catch (err) {
      console.error('Erreur acceptation invitation groupe:', err);
      setError(err.response?.data?.error || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectGroup = async (invitationId) => {
    try {
      setProcessing(true);
      await rejectGroupInvitation(invitationId);
      setGroupInvites((prev) => prev.filter((i) => i.id !== invitationId));
    } catch (err) {
      console.error('Erreur refus invitation groupe:', err);
      setError(err.response?.data?.error || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && !loading) {
      loadAll();
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isLu: true } : n))
      );
    } catch (err) {
      console.error('Erreur mark read:', err);
    }
  };

  return (
    <div className="notif-wrapper">
      <button className="notif-bell" onClick={handleOpen}>
        🔔
        {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-header">
            <strong>Notifications</strong>
            {loading && <span className="notif-loading">Chargement...</span>}
          </div>
          {error && <div className="notif-error">{error}</div>}

          <div className="notif-section">
            <div className="notif-section-title">Invitations de groupe</div>
            {groupInvites.length === 0 ? (
              <div className="notif-empty">Aucune invitation</div>
            ) : (
              groupInvites.map((inv) => (
                <div key={inv.id} className="notif-item">
                  <div>
                    <div className="notif-title">{inv.groupTitle}</div>
                    <div className="notif-sub">Invité par {inv.inviterPseudo}</div>
                  </div>
                  <div className="notif-actions">
                    <button
                      className="notif-accept"
                      onClick={() => handleAcceptGroup(inv.id, inv.groupId)}
                      disabled={processing}
                    >
                      ✓
                    </button>
                    <button
                      className="notif-reject"
                      onClick={() => handleRejectGroup(inv.id)}
                      disabled={processing}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="notif-section">
            <div className="notif-section-title">Demandes d'amis</div>
            {friendRequests.length === 0 ? (
              <div className="notif-empty">Aucune demande</div>
            ) : (
              friendRequests.map((req) => (
                <div key={req.id} className="notif-item">
                  <div>
                    <div className="notif-title">{req.requester.pseudo}</div>
                    {req.requester.bio && (
                      <div className="notif-sub">{req.requester.bio}</div>
                    )}
                  </div>
                  <div className="notif-actions">
                    <button
                      className="notif-accept"
                      onClick={() => handleAcceptFriend(req.requester.id)}
                      disabled={processing}
                    >
                      ✓
                    </button>
                    <button
                      className="notif-reject"
                      onClick={() => handleRejectFriend(req.requester.id)}
                      disabled={processing}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="notif-section">
            <div className="notif-section-title">Autres</div>
            {(!notifications || notifications.length === 0) ? (
              <div className="notif-empty">Rien à afficher</div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className={`notif-item ${notif.isLu ? 'read' : ''}`}>
                  <div>
                    <div className="notif-title">{notif.titre}</div>
                    {notif.message && <div className="notif-sub">{notif.message}</div>}
                  </div>
                  {!notif.isLu && (
                    <button className="notif-mark" onClick={() => handleMarkRead(notif.id)}>
                      Marquer lu
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;

