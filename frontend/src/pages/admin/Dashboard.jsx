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
//   const [actionMsg, setActionMsg] = useState('');
//   const [actionErr, setActionErr] = useState('');
//   const [busyTerm, setBusyTerm] = useState(null);
//
//   const [newSessionName, setNewSessionName] = useState('');
//   const [newTermName, setNewTermName] = useState('');
//   const [newTermSessionId, setNewTermSessionId] = useState('');
//
//   const load = useCallback(async () => {
//     setError('');
//     setLoading(true);
//     try {
//       const [statsData, sessionsData, termsData] = await Promise.all([
//         apiFetch('/dashboard'),
//         apiFetch('/sessions'),
//         apiFetch('/terms'),
//       ]);
//       setStats(statsData);
//       setSessions(sessionsData);
//       setTerms(termsData);
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
//       await load();
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
//   // Small labeled stat cell — used inside the stat strip
//   const Stat = ({ icon, label, value, tone }) => (
//     <div style={{
//       flex: '1 1 0', minWidth: '150px',
//       padding: '0.9rem 1.25rem',
//       borderLeft: '1px solid var(--border)',
//     }}>
//       <div className="text-muted" style={{
//         fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
//         display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.3rem'
//       }}>
//         {icon}{label}
//       </div>
//       <div style={{
//         fontSize: '1.5rem', fontWeight: 700,
//         fontVariantNumeric: 'tabular-nums',
//         color: tone || 'var(--text)', lineHeight: 1.1
//       }}>
//         {value}
//       </div>
//     </div>
//   );
//
//   return (
//     <div>
//       {/* Page header — title left, meta right, no card */}
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
//         <div>
//           <h1 style={{ marginBottom: '0.15rem' }}>Dashboard</h1>
//           <span className="text-muted" style={{ fontSize: '0.85rem' }}>
//             {terms.find(t => t.active)
//               ? `${terms.find(t => t.active).name} · ${terms.find(t => t.active).session_name}`
//               : 'No active term'}
//           </span>
//         </div>
//         <button className="btn-ghost" onClick={load} title="Refresh" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
//           <FiRefreshCw size={14} /> Refresh
//         </button>
//       </div>
//
//       {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}
//       {actionMsg && <div className="success-text" style={{ marginBottom: '0.75rem' }}>{actionMsg}</div>}
//       {actionErr && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{actionErr}</div>}
//
//       {/* ===== STAT STRIP — one surface, divided cells (not 5 identical cards) ===== */}
//       <div className="card" style={{
//         padding: 0, marginBottom: '1.75rem',
//         display: 'flex', flexWrap: 'wrap', alignItems: 'stretch'
//       }}>
//         <Stat icon={<FiUsers size={13} />} label="Students" value={stats?.students ?? '—'} />
//         <Stat icon={<FiUserCheck size={13} />} label="Teachers" value={stats?.teachers ?? '—'} />
//         <Stat icon={<FiGrid size={13} />} label="Classes" value={stats?.classes ?? '—'} />
//         <Stat icon={<FiTrendingUp size={13} />} label="Collected · this term" value={formatNaira(stats?.activeTermPayments)} tone="var(--success)" />
//         <Stat icon={<FiAlertCircle size={13} />} label="Outstanding · this term" value={formatNaira(stats?.activeTermBalances)} tone="var(--danger)" />
//       </div>
//
//       {/* ===== TWO-COLUMN: terms get the wider share (busier table) ===== */}
//       <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: '1.25rem', alignItems: 'start' }}>
//         {/* TERMS — primary workload, wider column */}
//         <div className="card">
//           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
//             <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
//               Terms
//             </h2>
//             <span className="text-muted" style={{ fontSize: '0.75rem' }}>3 per session</span>
//           </div>
//
//           <div className="table-container">
//             <table>
//               <thead>
//                 <tr><th>Term</th><th>Session</th><th>Status</th><th style={{ width: '230px' }}></th></tr>
//               </thead>
//               <tbody>
//                 {terms.length === 0 && <tr><td colSpan="4" className="text-muted">No terms yet</td></tr>}
//                 {terms.map(t => {
//                   const active = t.active && !t.closed;
//                   return (
//                     <tr key={t.id}>
//                       <td style={{ fontWeight: 600 }}>{t.name}</td>
//                       <td className="text-muted">{t.session_name}</td>
//                       <td>
//                         {active && <span className="badge badge-success">Active</span>}
//                         {t.closed && <span className="badge badge-danger">Closed</span>}
//                         {!t.active && !t.closed && <span className="text-muted">Pending</span>}
//                       </td>
//                       <td>
//                         <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
//                           <button className="btn-primary" style={{ padding: '0.28rem 0.7rem', fontSize: '0.78rem' }}
//                                   disabled={active || t.closed || busyTerm === t.id}
//                                   title={t.closed ? 'Reopen first' : active ? 'Currently active' : ''}
//                                   onClick={() => activateTerm(t)}>
//                             Activate
//                           </button>
//                           <button className="btn-danger" style={{ padding: '0.28rem 0.7rem', fontSize: '0.78rem' }}
//                                   disabled={!active || busyTerm === t.id}
//                                   onClick={() => closeTerm(t)}>
//                             Close
//                           </button>
//                           <button className="btn-ghost" style={{ padding: '0.28rem 0.7rem', fontSize: '0.78rem', border: '1px solid var(--border)' }}
//                                   disabled={!t.closed || busyTerm === t.id}
//                                   onClick={() => reopenTerm(t)}>
//                             Reopen
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//
//           {/* Inline create — separated by hairline, not its own box */}
//           <form onSubmit={createTerm} style={{
//             display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
//             borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem'
//           }}>
//             <input placeholder="New term — e.g. First Term" value={newTermName}
//                    onChange={e => setNewTermName(e.target.value)} required
//                    style={{ flex: '2', minWidth: '140px', marginBottom: 0 }} />
//             <select value={newTermSessionId} onChange={e => setNewTermSessionId(e.target.value)} required
//                     style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
//               <option value="" disabled>Session…</option>
//               {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
//             </select>
//             <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Add</button>
//           </form>
//
//           <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.6rem', marginBottom: 0 }}>
//             Closing locks attendance &amp; exams — fees stay open.
//           </p>
//         </div>
//
//         {/* SESSIONS — narrower column */}
//         <div className="card">
//           <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
//             Sessions
//           </h2>
//
//           <div className="table-container">
//             <table>
//               <thead>
//                 <tr><th>Session</th><th style={{ width: '100px' }}></th></tr>
//               </thead>
//               <tbody>
//                 {sessions.length === 0 && <tr><td colSpan="2" className="text-muted">None yet</td></tr>}
//                 {sessions.map(s => (
//                   <tr key={s.id}>
//                     <td style={{ fontWeight: s.active ? 600 : 400 }}>
//                       {s.name}
//                       {s.active && <span className="badge badge-success" style={{ marginLeft: '0.5rem' }}>Active</span>}
//                     </td>
//                     <td style={{ textAlign: 'right' }}>
//                       {!s.active && (
//                         <button className="btn-ghost" style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem', border: '1px solid var(--border)' }}
//                                 onClick={() => activateSession(s)}>
//                           Activate
//                         </button>
//                       )}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//
//           <form onSubmit={createSession} style={{
//             display: 'flex', gap: '0.5rem',
//             borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem'
//           }}>
//             <input placeholder="2026/2027" value={newSessionName}
//                    onChange={e => setNewSessionName(e.target.value)} required style={{ marginBottom: 0 }} />
//             <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Add</button>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }


import React, { useState, useEffect, useCallback } from 'react';
import { FiUsers, FiUserCheck, FiGrid, FiTrendingUp, FiAlertCircle,
         FiRefreshCw, FiUserX, FiCheckCircle, FiFileText, FiPlus } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { formatNaira } from '../../utils/format';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      setStats(await apiFetch('/dashboard'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="card">Loading dashboard...</div>;

  const Stat = ({ icon, label, value, tone }) => (
    <div style={{ flex: '1 1 0', minWidth: '150px', padding: '0.9rem 1.25rem', borderLeft: '1px solid var(--border)' }}>
      <div className="text-muted" style={{
        fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.3rem'
      }}>
        {icon}{label}
      </div>
      <div style={{
        fontSize: '1.5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        color: tone || 'var(--text)', lineHeight: 1.1
      }}>
        {value}
      </div>
    </div>
  );

  const QuickLink = ({ to, icon, label }) => (
    <Link to={to} className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', padding: '0.6rem 0.9rem', textDecoration: 'none' }}>
      {icon}{label}
    </Link>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.15rem' }}>Dashboard</h1>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>School overview</span>
        </div>
        <button className="btn-ghost" onClick={load} title="Refresh" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* ===== STAT STRIP ===== */}
      <div className="card" style={{ padding: 0, marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
        <Stat icon={<FiUsers size={13} />} label="Students" value={stats?.students ?? '—'} />
        <Stat icon={<FiUserCheck size={13} />} label="Teachers" value={stats?.teachers ?? '—'} />
        <Stat icon={<FiGrid size={13} />} label="Classes" value={stats?.classes ?? '—'} />
        <Stat icon={<FiTrendingUp size={13} />} label="Collected · this term" value={formatNaira(stats?.activeTermPayments)} tone="var(--success)" />
        <Stat icon={<FiAlertCircle size={13} />} label="Outstanding · this term" value={formatNaira(stats?.activeTermBalances)} tone="var(--danger)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: '1.25rem', alignItems: 'start' }}>
        {/* ===== TODAY AT A GLANCE (live, non-redundant) ===== */}
        <div className="card" style={{ minWidth: 0 }}>
          <h2 className="section-label" style={{ marginBottom: '0.9rem' }}>Today at a glance</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FiUserX size={20} color="var(--danger)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{stats?.studentsAbsentToday ?? 0}</div>
                <div className="text-muted" style={{ fontSize: '0.78rem' }}>students absent today</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FiCheckCircle size={20} color="var(--success)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{stats?.teachersPresentToday ?? 0}</div>
                <div className="text-muted" style={{ fontSize: '0.78rem' }}>teachers present today</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FiFileText size={20} color="var(--warning)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{stats?.pendingReportCards ?? 0}</div>
                <div className="text-muted" style={{ fontSize: '0.78rem' }}>report cards awaiting review</div>
              </div>
            </div>
          </div>
          <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '1rem', marginBottom: 0 }}>
            Live counters — mark an attendance or publish a card and watch them move.
          </p>
        </div>

        {/* ===== QUICK ACTIONS ===== */}
        <div className="card" style={{ minWidth: 0 }}>
          <h2 className="section-label" style={{ marginBottom: '0.9rem' }}>Quick actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <QuickLink to="/admin/students" icon={<FiPlus size={14} />} label="Admit a student" />
            <QuickLink to="/admin/fees" icon={<FiTrendingUp size={14} />} label="Record a payment" />
            <QuickLink to="/admin/report-cards" icon={<FiFileText size={14} />} label="Review report cards" />
            <QuickLink to="/admin/exams" icon={<FiPlus size={14} />} label="Create an exam" />
          </div>
        </div>
      </div>
    </div>
  );
}