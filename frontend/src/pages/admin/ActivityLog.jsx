import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { apiFetch } from '../../api/client';
import { formatDateTime } from '../../utils/format';

// "users" -> "User", "report_card_uploads" -> "Report card", etc.
const TARGET_NAMES = {
  users: 'User',
  students: 'Student',
  classes: 'Class',
  invoices: 'Invoice',
  exams: 'Exam',
  terms: 'Term',
  academic_sessions: 'Session',
  subjects: 'Subject',
  scores: 'Score',
  results: 'Result',
  timetable: 'Timetable entry',
  report_card_uploads: 'Report card',
  teacher_attendance: 'Teacher attendance',
};

function prettyTarget(type, id) {
  if (!type && !id) return '—';
  const name = TARGET_NAMES[type] || (type ? type.replace(/_/g, ' ') : '');
  return id ? `${name} #${id}` : name || '—';
}

// new_value/old_value arrive as {"type":"jsonb","value":"{\"date\":...}"} —
// unwrap and parse into clean key: value pairs
function parseDetails(entry) {
  const raw = entry?.new_value?.value || entry?.old_value?.value || null;
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') {
      return Object.entries(obj)
        .map(([k, v]) => `${k}: ${v}`)
        .join('  ·  ');
    }
    return String(obj);
  } catch {
    return String(raw); // wasn't JSON — show as-is
  }
}

export default function ActivityLog() {
  const [items, setItems] = useState([]);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', action: '', q: '' });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (p = page) => {
    setError('');
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (filters.status) params.append('status', filters.status);
      if (filters.action) params.append('action', filters.action);
      if (filters.q) params.append('q', filters.q);
      const data = await apiFetch(`/audit-logs?${params.toString()}`);
      setItems(data.items);
      setPages(data.pages);
      setPage(data.page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(1); }, [filters]);

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.15rem' }}>Activity Log</h1>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>Immutable — entries can never be edited or deleted</span>
        </div>
        <button className="btn-ghost" onClick={() => load()} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="blocked">Blocked</option>
          </select>
          <input placeholder="Filter action — e.g. LOGIN" value={filters.action}
                 onChange={e => setFilters(f => ({ ...f, action: e.target.value }))} />
          <input placeholder="Search…" value={filters.q}
                 onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} />
        </div>
      </div>

      <div className="card" style={{ minWidth: 0 }}>
        <div className="table-container">
          <table className="compact-table">
            <thead>
              <tr><th>When</th><th>Who</th><th>Role</th><th>Action</th><th>Target</th><th>Details</th><th>IP</th></tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && <tr><td colSpan="7"><div className="skeleton" style={{ height: '3rem' }} /></td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan="7" className="text-muted">No entries</td></tr>}
              {items.map(a => {
                const details = parseDetails(a);
                return (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{formatDateTime(a.created_at)}</td>
                    <td>{a.actor_id ?? <span className="text-muted">system</span>}</td>
                    <td>{a.actor_role || <span className="text-muted">—</span>}</td>
                    <td style={{ fontWeight: 600 }}>
                      {a.action}
                      {a.status === 'blocked' && <span className="badge badge-danger" style={{ marginLeft: '0.4rem' }}>blocked</span>}
                    </td>
                    <td>{prettyTarget(a.target_type, a.target_id)}</td>
                    <td className="cell-truncate" title={details || ''} style={{ maxWidth: '260px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {details || '—'}
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.75rem' }}>{a.ip_address}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Page {page} of {pages}</span>
            <button className="btn-ghost" style={{ border: '1px solid var(--border)', padding: '0.25rem 0.7rem', fontSize: '0.8rem' }}
                    disabled={page <= 1} onClick={() => load(page - 1)}>Prev</button>
            <button className="btn-ghost" style={{ border: '1px solid var(--border)', padding: '0.25rem 0.7rem', fontSize: '0.8rem' }}
                    disabled={page >= pages} onClick={() => load(page + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}