import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { apiFetch } from '../../api/client';
import { formatNaira } from '../../utils/format';

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');

  // Create form
  const [name, setName] = useState('');
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [ex, cls, sub, tms] = await Promise.all([
        apiFetch('/exams'),
        apiFetch('/classes'),
        apiFetch('/subjects'),
        apiFetch('/terms'),
      ]);
      setExams(ex);
      setClasses(cls);
      setSubjects(sub);
      setTerms(tms);
      const active = tms.find(t => t.active && !t.closed);
      if (active) setTermId(prev => prev || String(active.id));
      if (cls.length) setClassId(prev => prev || String(cls[0].id));
      if (sub.length) setSubjectId(prev => prev || String(sub[0].id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setActionMsg(''); setActionErr('');
    setBusy(true);
    try {
      await apiFetch('/exams', {
        method: 'POST',
        body: JSON.stringify({
          name,
          termId: Number(termId),
          classId: Number(classId),
          subjectId: Number(subjectId),
          maxScore: Number(maxScore) || 100
        })
      });
      setName('');
      setMaxScore('100');
      setActionMsg('Exam created');
      await load();
    } catch (err) {
      setActionErr(err.message);   // closed term (400) / missing refs (400) land here
    } finally {
      setBusy(false);
    }
  };

  const activeTerm = terms.find(t => t.active && !t.closed);
  const duplicate = exams.some(x =>
    x.name.toLowerCase() === name.trim().toLowerCase() &&
    String(x.class_id) === classId && String(x.subject_id) === subjectId && String(x.term_id) === termId);

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.15rem' }}>Exams</h1>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
            {activeTerm ? `Active: ${activeTerm.name} · ${activeTerm.session_name}` : 'No open term — exams cannot be created until one is activated'}
          </span>
        </div>
        <button className="btn-ghost" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}
      {actionMsg && <div className="success-text" style={{ marginBottom: '0.75rem' }}>{actionMsg}</div>}
      {actionErr && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{actionErr}</div>}

      {/* ===== CREATE ===== */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Create an exam</h2>
        <form onSubmit={create} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.7fr auto', gap: '0.5rem' }}>
          <input placeholder="Exam name — e.g. First Term Exam" value={name}
                 onChange={e => setName(e.target.value)} required />
          <select value={termId} onChange={e => setTermId(e.target.value)} required>
            <option value="" disabled>Term…</option>
            {terms.map(t => (
              <option key={t.id} value={t.id} disabled={t.closed}>
                {t.name} ({t.session_name}){t.closed ? ' — closed' : ''}
              </option>
            ))}
          </select>
          <select value={classId} onChange={e => setClassId(e.target.value)} required>
            <option value="" disabled>Class…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={subjectId} onChange={e => setSubjectId(e.target.value)} required>
            <option value="" disabled>Subject…</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="number" min="1" max="1000" value={maxScore}
                 onChange={e => setMaxScore(e.target.value)} required title="Maximum score" />
          <button type="submit" className="btn-primary" disabled={busy || !activeTerm} style={{ whiteSpace: 'nowrap' }}>
            {busy ? '…' : 'Create'}
          </button>
        </form>
        {duplicate && name.trim() && (
          <p className="error-text" style={{ marginBottom: 0 }}>
            An exam with this name already exists for this class, subject, and term.
          </p>
        )}
        <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.6rem', marginBottom: 0 }}>
          Exams can't be created for a closed term — reopen the term first if needed. Teachers see these exams in their Report Cards upload form, scoped to their own classes.
        </p>
      </div>

      {/* ===== TABLE ===== */}
      <div className="card" style={{ minWidth: 0 }}>
        <h2 className="section-label" style={{ marginBottom: '1rem' }}>All exams — {exams.length}</h2>
        <div className="table-container">
          <table className="compact-table">
            <thead>
              <tr><th>Name</th><th>Class</th><th>Subject</th><th>Term</th><th>Max Score</th></tr>
            </thead>
            <tbody>
              {loading && exams.length === 0 && (
                <tr><td colSpan="5"><div className="skeleton" style={{ height: '2.2rem' }} /></td></tr>
              )}
              {!loading && exams.length === 0 && (
                <tr><td colSpan="5" className="text-muted">No exams yet</td></tr>
              )}
              {exams.map(x => (
                <tr key={x.id}>
                  <td style={{ fontWeight: 600 }}>{x.name}</td>
                  <td>{x.class_name}</td>
                  <td>{x.subject_name}</td>
                  <td>{x.term_name}</td>
                  <td>{x.max_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}