import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { apiFetch } from '../../api/client';
// import { apiGet } from '../../api/client';

export default function SessionsTerms() {
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [sessionName, setSessionName] = useState('');
  const [termName, setTermName] = useState('');
  const [termSessionId, setTermSessionId] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [s, t] = await Promise.all([apiFetch('/sessions'), apiFetch('/terms')]);
      setSessions(s);
      setTerms(t);
      const active = s.find(x => x.active);
      if (active) setTermSessionId(prev => prev || String(active.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (fn, okMsg) => {
    setMsg(''); setErr('');
    try {
      await fn();
      setMsg(okMsg);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const createSession = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      await apiFetch('/sessions', { method: 'POST', body: JSON.stringify({ name: sessionName }) });
      setSessionName('');
      setMsg('Session created');
      await load();
    } catch (e2) { setErr(e2.message); }
  };

  const createTerm = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      await apiFetch('/terms', {
        method: 'POST',
        body: JSON.stringify({ name: termName, sessionId: Number(termSessionId) })
      });
      setTermName('');
      setMsg('Term created');
      await load();
    } catch (e2) { setErr(e2.message); }
  };

  const activateSession = (s) => {
    setBusyId(s.id);
    act(() => apiFetch(`/sessions/activate/${s.id}`, { method: 'POST' }), `${s.name} activated`);
  };
  const activateTerm = (t) => {
    setBusyId(t.id);
    act(() => apiFetch(`/terms/activate/${t.id}`, { method: 'POST' }), `${t.name} activated`);
  };
  const closeTerm = (t) => {
    if (!window.confirm(`Close ${t.name}? Attendance and exams will be locked. Fees stay open.`)) return;
    setBusyId(t.id);
    act(() => apiFetch(`/terms/close/${t.id}`, { method: 'POST' }), `${t.name} closed`);
  };
  const reopenTerm = (t) => {
    setBusyId(t.id);
    act(() => apiFetch(`/terms/reopen/${t.id}`, { method: 'POST' }), `${t.name} reopened`);
  };

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ marginBottom: '0.15rem' }}>Sessions & Terms</h1>
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
          3 terms per session · closing locks attendance and exams, fees stay open
        </span>
      </div>

      {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}
      {msg && <div className="success-text" style={{ marginBottom: '0.75rem' }}>{msg}</div>}
      {err && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: '1.25rem', alignItems: 'start' }}>
        {/* TERMS */}
        <div className="card" style={{ minWidth: 0 }}>
          <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Terms</h2>
          <div className="table-container">
            <table className="compact-table">
              <thead><tr><th>Term</th><th>Session</th><th>Status</th><th style={{ width: '230px' }}></th></tr></thead>
              <tbody>
                {loading && terms.length === 0 && <tr><td colSpan="4"><div className="skeleton" style={{ height: '2.2rem' }} /></td></tr>}
                {!loading && terms.length === 0 && <tr><td colSpan="4" className="text-muted">No terms yet</td></tr>}
                {terms.map(t => {
                  const active = t.active && !t.closed;
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td className="text-muted">{t.session_name}</td>
                      <td>
                        {active && <span className="badge badge-success">Active</span>}
                        {t.closed && <span className="badge badge-danger">Closed</span>}
                        {!t.active && !t.closed && <span className="text-muted">Pending</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button className="btn-primary" style={{ padding: '0.28rem 0.7rem', fontSize: '0.78rem' }}
                                  disabled={active || t.closed || busyId === t.id}
                                  onClick={() => activateTerm(t)}>Activate</button>
                          <button className="btn-danger" style={{ padding: '0.28rem 0.7rem', fontSize: '0.78rem' }}
                                  disabled={!active || busyId === t.id}
                                  onClick={() => closeTerm(t)}>Close</button>
                          <button className="btn-ghost" style={{ padding: '0.28rem 0.7rem', fontSize: '0.78rem', border: '1px solid var(--border)' }}
                                  disabled={!t.closed || busyId === t.id}
                                  onClick={() => reopenTerm(t)}>Reopen</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <form onSubmit={createTerm} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
            <input placeholder="Term — e.g. First Term" value={termName} onChange={e => setTermName(e.target.value)}
                   required style={{ flex: '2', minWidth: '140px', marginBottom: 0 }} />
            <select value={termSessionId} onChange={e => setTermSessionId(e.target.value)} required
                    style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
              <option value="" disabled>Session…</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Add</button>
          </form>
        </div>

        {/* SESSIONS */}
        <div className="card" style={{ minWidth: 0 }}>
          <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Sessions</h2>
          <div className="table-container">
            <table className="compact-table">
              <thead><tr><th>Session</th><th style={{ width: '100px' }}></th></tr></thead>
              <tbody>
                {loading && sessions.length === 0 && <tr><td colSpan="2"><div className="skeleton" style={{ height: '2rem' }} /></td></tr>}
                {!loading && sessions.length === 0 && <tr><td colSpan="2" className="text-muted">None yet</td></tr>}
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: s.active ? 600 : 400 }}>
                      {s.name}
                      {s.active && <span className="badge badge-success" style={{ marginLeft: '0.5rem' }}>Active</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!s.active && (
                        <button className="btn-ghost" style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem', border: '1px solid var(--border)' }}
                                onClick={() => activateSession(s)}>Activate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form onSubmit={createSession} style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
            <input placeholder="2026/2027" value={sessionName} onChange={e => setSessionName(e.target.value)}
                   required style={{ marginBottom: 0 }} />
            <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Add</button>
          </form>
        </div>
      </div>
    </div>
  );
}