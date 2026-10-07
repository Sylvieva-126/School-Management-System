// src/components/NotificationBell.jsx — topbar bell.
// 30s poll of unread-count; dropdown lists latest 30; click an unread
// item to mark it read. Body text wraps (overflowWrap anywhere) or long
// activation links stretch the page — gotcha #8.
import { useState, useEffect, useRef } from 'react';
import { FaBell, FaRegCheckCircle } from 'react-icons/fa';
import { apiFetch } from '../api/client';
import { formatDateTime } from '../utils/format';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  // Poll unread count every 30 seconds (her spec). Silent failure —
  // a backend blip must never crash the topbar.
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const d = await apiFetch('/notifications/unread-count');
        if (alive) setUnread(d.count || 0);
      } catch { /* ignore */ }
    }
    tick();
    const id = setInterval(tick, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Close the dropdown when clicking anywhere outside it
  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const list = await apiFetch('/notifications'); // latest 30
        setItems(Array.isArray(list) ? list : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
  }

  async function markRead(n) {
    if (n.is_read) return;
    try {
      await apiFetch(`/notifications/read/${n.id}`, { method: 'POST' });
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
    } catch { /* leave unread; not critical */ }
  }

  return (
    <div style={{ position: 'relative' }} ref={boxRef}>
      <button
        className="btn-ghost"
        style={{ padding: '0.4rem 0.6rem', position: 'relative' }}
        onClick={toggle}
        title="Notifications"
      >
        <FaBell />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            backgroundColor: 'var(--danger)', color: '#fff',
            borderRadius: '9999px', fontSize: '0.6rem', fontWeight: 600,
            minWidth: 16, height: 16, padding: '0 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)',
            width: 370, maxWidth: '90vw', maxHeight: 480,
            overflowY: 'auto', overflowX: 'hidden', // gotcha #8
            zIndex: 45, padding: 0,
          }}
        >
          <div style={{ padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--border)' }}>
            <h3>Notifications</h3>
          </div>

          {loading ? (
            <div style={{ padding: '1rem' }}>
              <div className="skeleton" style={{ height: 64 }} />
              <div className="skeleton" style={{ height: 64, marginTop: 8 }} />
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted" style={{ padding: '1.1rem' }}>No notifications yet.</p>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                onClick={() => markRead(n)}
                style={{
                  padding: '0.9rem 1.1rem',
                  borderBottom: '1px solid var(--border)',
                  cursor: n.is_read ? 'default' : 'pointer',
                  backgroundColor: n.is_read ? 'transparent' : 'var(--surface-2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <strong>{n.title || 'Notification'}</strong>
                  {!n.is_read && (
                    <FaRegCheckCircle
                      title="Mark as read"
                      style={{ flexShrink: 0, color: 'var(--primary)', marginTop: 3 }}
                    />
                  )}
                </div>
                <div style={{ overflowWrap: 'anywhere' }}>{n.body}</div>
                <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.35rem' }}>
                  {formatDateTime(n.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}