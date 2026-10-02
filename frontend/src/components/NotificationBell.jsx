import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiCheckCircle } from 'react-icons/fi';
import { apiFetch } from '../api/client';
import { formatDateTime } from '../utils/format';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchCount = async () => {
    try {
      const data = await apiFetch('/notifications/unread-count');
      setUnreadCount(data.count || 0);
    } catch (err) {
      // silently fail polling
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await apiFetch('/notifications');
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) fetchNotifications();
    setIsOpen(!isOpen);
  };

  const markAsRead = async (id) => {
    try {
      await apiFetch(`/notifications/read/${id}`, { method: 'POST' });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button className="btn-ghost" onClick={toggleDropdown} aria-label="Notifications" style={{ position: 'relative', padding: '0.5rem' }}>
        <FiBell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            backgroundColor: 'var(--danger)', color: '#FFF',
            fontSize: '0.65rem', fontWeight: 'bold',
            borderRadius: '9999px', padding: '0.1rem 0.3rem'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem',
          width: '320px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 50,
          maxHeight: '400px', overflowY: 'auto'
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No notifications</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} style={{
                padding: '1rem', borderBottom: '1px solid var(--border)',
                backgroundColor: n.is_read ? 'transparent' : 'var(--border)',
                cursor: n.is_read ? 'default' : 'pointer'
              }} onClick={() => !n.is_read && markAsRead(n.id)}>
                <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{n.title}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>{n.body}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{formatDateTime(n.created_at)}</span>
                  {!n.is_read && <FiCheckCircle title="Click to mark read" />}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}