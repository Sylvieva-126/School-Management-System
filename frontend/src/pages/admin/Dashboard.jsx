// import React, { useState, useEffect, useCallback } from 'react';
// import { FiUsers, FiUserCheck, FiGrid, FiTrendingUp, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
// import { apiFetch } from '../../api/client';
// import { formatNaira } from '../../utils/format';
//
// export default function Dashboard() {
//   const [stats, setStats] = useState(null);
//   const [sessions, setSessions] = useState([]);
//   const [terms, setTerms] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [actionMsg, setActionMsg] = useState('');   // success feedback
//   const [actionErr, setActionErr] = useState('');   // action error feedback
//   const [busyTerm, setBusyTerm] = useState(null);   // disable buttons per-term while acting
//
//   // New-session form
//   const [newSessionName, setNewSessionName] = useState('');
//   // New-term form
//   const [newTermName, setNewTermName] = useState('');
//   const [newTermSessionId, setNewTermSessionId] = useState('');
//
//   const load = useCallback(async () => {
//     setError('');
//     setLoading(true);
//     try {
//       // Parallel fetches — independent endpoints
//       const [statsData, sessionsData, termsData] = await Promise.all([
//         apiFetch('/dashboard'),
//         apiFetch('/sessions'),
//         apiFetch('/terms'),
//       ]);
//       setStats(statsData);
//       setSessions(sessionsData);
//       setTerms(termsData);
//       // Default the term-form dropdown to the active session if set
//       const active = sessionsData.find(s => s.active);
//       if (active) setNewTermSessionId(prev => prev || String(active.id));
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }, []);
//
//   useEffect(() => { load(); }, [load]);
//
//   const runAction = async (termId, fn, successMsg) => {
//     setActionMsg(''); setActionErr('');
//     setBusyTerm(termId);
//     try {
//       await fn();
//       setActionMsg(successMsg);
//       await load(); // refresh both lists (active/closed flags changed)
//     } catch (err) {
//       setActionErr(err.message);
//     } finally {
//       setBusyTerm(null);
//     }
//   };
//
//   const activateSession = (s) => runAction(null,
//     () => apiFetch(`/sessions/activate/${s.id}`, { method: 'POST' }),
//     `Session ${s.name} activated`);
//
//   const activateTerm = (t) => runAction(t.id,
//     () => apiFetch(`/terms/activate/${t.id}`, { method: 'POST' }),
//     `${t.name} activated`);
//
//   const closeTerm = (t) => {
//     if (!window.confirm(`Close ${t.name}? Attendance and exams will be locked.\nFees stay open.`)) return;
//     runAction(t.id,
//       () => apiFetch(`/terms/close/${t.id}`, { method: 'POST' }),
//       `${t.name} closed`);
//   };
//
//   const reopenTerm = (t) => runAction(t.id,
//     () => apiFetch(`/terms/reopen/${t.id}`, { method: 'POST' }),
//     `${t.name} reopened`);
//
//   const createSession = async (e) => {
//     e.preventDefault();
//     setActionMsg(''); setActionErr('');
//     try {
//       await apiFetch('/sessions', { method: 'POST', body: JSON.stringify({ name: newSessionName }) });
//       setNewSessionName('');
//       setActionMsg('Session created');
//       await load();
//     } catch (err) {
//       setActionErr(err.message);
//     }
//   };
//
//   const createTerm = async (e) => {
//     e.preventDefault();
//     setActionMsg(''); setActionErr('');
//     try {
//       await apiFetch('/terms', {
//         method: 'POST',
//         body: JSON.stringify({ name: newTermName, sessionId: Number(newTermSessionId) })
//       });
//       setNewTermName('');
//       setActionMsg('Term created');
//       await load();
//     } catch (err) {
//       setActionErr(err.message);
//     }
//   };
//
//   if (loading) return <div className="card">Loading dashboard...</div>;
//
//   return (
//     <div>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
//         <h1>Dashboard</h1>
//         <button className="btn-ghost" onClick={load} title="Refresh">
//           <FiRefreshCw size={16} style={{ verticalAlign: 'middle' }} /> Refresh
//         </button>
//       </div>
//
//       {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}
//       {actionMsg && <div className="success-text" style={{ marginBottom: '1rem' }}>{actionMsg}</div>}
//       {actionErr && <div className="error-text" style={{ marginBottom: '1rem' }}>{actionErr}</div>}
//
//       {/* ===== STAT CARDS ===== */}
//       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
//         <div className="card" style={{ marginBottom: 0 }}>
//           <div className="text-muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
//             <FiUsers /> Students
//           </div>
//           <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{stats?.students ?? '—'}</div>
//         </div>
//         <div className="card" style={{ marginBottom: 0 }}>
//           <div className="text-muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
//             <FiUserCheck /> Teachers
//           </div>
//           <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{stats?.teachers ?? '—'}</div>
//         </div>
//         <div className="card" style={{ marginBottom: 0 }}>
//           <div className="text-muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
//             <FiGrid /> Classes
//           </div>
//           <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{stats?.classes ?? '—'}</div>
//         </div>
//         <div className="card" style={{ marginBottom: 0 }}>
//           <div className="text-muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
//             <FiTrendingUp /> Payments (active term)
//           </div>
//           <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--success)' }}>
//             {formatNaira(stats?.activeTermPayments)}
//           </div>
//         </div>
//         <div className="card" style={{ marginBottom: 0 }}>
//           <div className="text-muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
//             <FiAlertCircle /> Outstanding (active term)
//           </div>
//           <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--danger)' }}>
//             {formatNaira(stats?.activeTermBalances)}
//           </div>
//         </div>
//       </div>
//
//       {/* ===== SESSIONS ===== */}
//       <div className="card" style={{ marginBottom: '1rem' }}>
//         <h3>Sessions</h3>
//         <form onSubmit={createSession} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
//           <input
//             placeholder="e.g. 2026/2027"
//             value={newSessionName}
//             onChange={e => setNewSessionName(e.target.value)}
//             required
//           />
//           <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Create Session</button>
//         </form>
//         <div className="table-container">
//           <table>
//             <thead>
//               <tr><th>Session</th><th>Status</th><th style={{ width: '120px' }}></th></tr>
//             </thead>
//             <tbody>
//               {sessions.length === 0 && <tr><td colSpan="3" className="text-muted">No sessions yet</td></tr>}
//               {sessions.map(s => (
//                 <tr key={s.id}>
//                   <td>{s.name}</td>
//                   <td>{s.active ? <span className="badge badge-success">Active</span> : <span className="text-muted">—</span>}</td>
//                   <td>
//                     {!s.active && (
//                       <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
//                               onClick={() => activateSession(s)}>
//                         Activate
//                       </button>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>
//
//       {/* ===== TERMS ===== */}
//       <div className="card">
//         <h3>Terms</h3>
//         <form onSubmit={createTerm} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
//           <input
//             placeholder="e.g. First Term"
//             value={newTermName}
//             onChange={e => setNewTermName(e.target.value)}
//             required
//             style={{ flex: '1', minWidth: '140px' }}
//           />
//           <select value={newTermSessionId} onChange={e => setNewTermSessionId(e.target.value)} required
//                   style={{ flex: '1', minWidth: '160px' }}>
//             <option value="" disabled>Select session</option>
//             {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
//           </select>
//           <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Create Term</button>
//         </form>
//         <div className="table-container">
//           <table>
//             <thead>
//               <tr><th>Term</th><th>Session</th><th>Status</th><th style={{ width: '260px' }}>Actions</th></tr>
//             </thead>
//             <tbody>
//               {terms.length === 0 && <tr><td colSpan="4" className="text-muted">No terms yet</td></tr>}
//               {terms.map(t => (
//                 <tr key={t.id}>
//                   <td>{t.name}</td>
//                   <td className="text-muted">{t.session_name}</td>
//                   <td>
//                     {t.active && <span className="badge badge-success">Active</span>}
//                     {t.closed && <span className="badge badge-danger">Closed</span>}
//                     {!t.active && !t.closed && <span className="text-muted">—</span>}
//                   </td>
//                   <td>
//                     <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
//                       <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
//                               disabled={t.active || t.closed || busyTerm === t.id}
//                               title={t.closed ? 'Reopen first' : 'Already active'}
//                               onClick={() => activateTerm(t)}>
//                         Activate
//                       </button>
//                       <button className="btn-danger" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
//                               disabled={!t.active || t.closed || busyTerm === t.id}
//                               onClick={() => closeTerm(t)}>
//                         Close
//                       </button>
//                       <button className="btn-ghost" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', border: '1px solid var(--border)' }}
//                               disabled={!t.closed || busyTerm === t.id}
//                               onClick={() => reopenTerm(t)}>
//                         Reopen
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//         <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.75rem' }}>
//           Closing a term locks attendance and exams. Fees and invoices stay open.
//         </p>
//       </div>
//     </div>
//   );
// }

import React, { useState, useEffect, useCallback } from 'react';
import { FiUsers, FiUserCheck, FiGrid, FiTrendingUp, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { apiFetch } from '../../api/client';
import { formatNaira } from '../../utils/format';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');
  const [busyTerm, setBusyTerm] = useState(null);

  const [newSessionName, setNewSessionName] = useState('');
  const [newTermName, setNewTermName] = useState('');
  const [newTermSessionId, setNewTermSessionId] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [statsData, sessionsData, termsData] = await Promise.all([
        apiFetch('/dashboard'),
        apiFetch('/sessions'),
        apiFetch('/terms'),
      ]);
      setStats(statsData);
      setSessions(sessionsData);
      setTerms(termsData);
      const active = sessionsData.find(s => s.active);
      if (active) setNewTermSessionId(prev => prev || String(active.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAction = async (termId, fn, successMsg) => {
    setActionMsg(''); setActionErr('');
    setBusyTerm(termId);
    try {
      await fn();
      setActionMsg(successMsg);
      await load();
    } catch (err) {
      setActionErr(err.message);
    } finally {
      setBusyTerm(null);
    }
  };

  const activateSession = (s) => runAction(null,
    () => apiFetch(`/sessions/activate/${s.id}`, { method: 'POST' }),
    `Session ${s.name} activated`);

  const activateTerm = (t) => runAction(t.id,
    () => apiFetch(`/terms/activate/${t.id}`, { method: 'POST' }),
    `${t.name} activated`);

  const closeTerm = (t) => {
    if (!window.confirm(`Close ${t.name}? Attendance and exams will be locked.\nFees stay open.`)) return;
    runAction(t.id,
      () => apiFetch(`/terms/close/${t.id}`, { method: 'POST' }),
      `${t.name} closed`);
  };

  const reopenTerm = (t) => runAction(t.id,
    () => apiFetch(`/terms/reopen/${t.id}`, { method: 'POST' }),
    `${t.name} reopened`);

  const createSession = async (e) => {
    e.preventDefault();
    setActionMsg(''); setActionErr('');
    try {
      await apiFetch('/sessions', { method: 'POST', body: JSON.stringify({ name: newSessionName }) });
      setNewSessionName('');
      setActionMsg('Session created');
      await load();
    } catch (err) {
      setActionErr(err.message);
    }
  };

  const createTerm = async (e) => {
    e.preventDefault();
    setActionMsg(''); setActionErr('');
    try {
      await apiFetch('/terms', {
        method: 'POST',
        body: JSON.stringify({ name: newTermName, sessionId: Number(newTermSessionId) })
      });
      setNewTermName('');
      setActionMsg('Term created');
      await load();
    } catch (err) {
      setActionErr(err.message);
    }
  };

  if (loading) return <div className="card">Loading dashboard...</div>;

  // Small labeled stat cell — used inside the stat strip
  const Stat = ({ icon, label, value, tone }) => (
    <div style={{
      flex: '1 1 0', minWidth: '150px',
      padding: '0.9rem 1.25rem',
      borderLeft: '1px solid var(--border)',
    }}>
      <div className="text-muted" style={{
        fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.3rem'
      }}>
        {icon}{label}
      </div>
      <div style={{
        fontSize: '1.5rem', fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: tone || 'var(--text)', lineHeight: 1.1
      }}>
        {value}
      </div>
    </div>
  );

  return (
    <div>
      {/* Page header — title left, meta right, no card */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.15rem' }}>Dashboard</h1>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
            {terms.find(t => t.active)
              ? `${terms.find(t => t.active).name} · ${terms.find(t => t.active).session_name}`
              : 'No active term'}
          </span>
        </div>
        <button className="btn-ghost" onClick={load} title="Refresh" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}
      {actionMsg && <div className="success-text" style={{ marginBottom: '0.75rem' }}>{actionMsg}</div>}
      {actionErr && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{actionErr}</div>}

      {/* ===== STAT STRIP — one surface, divided cells (not 5 identical cards) ===== */}
      <div className="card" style={{
        padding: 0, marginBottom: '1.75rem',
        display: 'flex', flexWrap: 'wrap', alignItems: 'stretch'
      }}>
        <Stat icon={<FiUsers size={13} />} label="Students" value={stats?.students ?? '—'} />
        <Stat icon={<FiUserCheck size={13} />} label="Teachers" value={stats?.teachers ?? '—'} />
        <Stat icon={<FiGrid size={13} />} label="Classes" value={stats?.classes ?? '—'} />
        <Stat icon={<FiTrendingUp size={13} />} label="Collected · this term" value={formatNaira(stats?.activeTermPayments)} tone="var(--success)" />
        <Stat icon={<FiAlertCircle size={13} />} label="Outstanding · this term" value={formatNaira(stats?.activeTermBalances)} tone="var(--danger)" />
      </div>

      {/* ===== TWO-COLUMN: terms get the wider share (busier table) ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: '1.25rem', alignItems: 'start' }}>
        {/* TERMS — primary workload, wider column */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
              Terms
            </h2>
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>3 per session</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr><th>Term</th><th>Session</th><th>Status</th><th style={{ width: '230px' }}></th></tr>
              </thead>
              <tbody>
                {terms.length === 0 && <tr><td colSpan="4" className="text-muted">No terms yet</td></tr>}
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
                                  disabled={active || t.closed || busyTerm === t.id}
                                  title={t.closed ? 'Reopen first' : active ? 'Currently active' : ''}
                                  onClick={() => activateTerm(t)}>
                            Activate
                          </button>
                          <button className="btn-danger" style={{ padding: '0.28rem 0.7rem', fontSize: '0.78rem' }}
                                  disabled={!active || busyTerm === t.id}
                                  onClick={() => closeTerm(t)}>
                            Close
                          </button>
                          <button className="btn-ghost" style={{ padding: '0.28rem 0.7rem', fontSize: '0.78rem', border: '1px solid var(--border)' }}
                                  disabled={!t.closed || busyTerm === t.id}
                                  onClick={() => reopenTerm(t)}>
                            Reopen
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Inline create — separated by hairline, not its own box */}
          <form onSubmit={createTerm} style={{
            display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
            borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem'
          }}>
            <input placeholder="New term — e.g. First Term" value={newTermName}
                   onChange={e => setNewTermName(e.target.value)} required
                   style={{ flex: '2', minWidth: '140px', marginBottom: 0 }} />
            <select value={newTermSessionId} onChange={e => setNewTermSessionId(e.target.value)} required
                    style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
              <option value="" disabled>Session…</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Add</button>
          </form>

          <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.6rem', marginBottom: 0 }}>
            Closing locks attendance &amp; exams — fees stay open.
          </p>
        </div>

        {/* SESSIONS — narrower column */}
        <div className="card">
          <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Sessions
          </h2>

          <div className="table-container">
            <table>
              <thead>
                <tr><th>Session</th><th style={{ width: '100px' }}></th></tr>
              </thead>
              <tbody>
                {sessions.length === 0 && <tr><td colSpan="2" className="text-muted">None yet</td></tr>}
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: s.active ? 600 : 400 }}>
                      {s.name}
                      {s.active && <span className="badge badge-success" style={{ marginLeft: '0.5rem' }}>Active</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!s.active && (
                        <button className="btn-ghost" style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem', border: '1px solid var(--border)' }}
                                onClick={() => activateSession(s)}>
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={createSession} style={{
            display: 'flex', gap: '0.5rem',
            borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem'
          }}>
            <input placeholder="2026/2027" value={newSessionName}
                   onChange={e => setNewSessionName(e.target.value)} required style={{ marginBottom: 0 }} />
            <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Add</button>
          </form>
        </div>
      </div>
    </div>
  );
}