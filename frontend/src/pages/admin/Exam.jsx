// src/pages/admin/Exams.jsx — Tier 1, build item 7.
// Create form (closed terms disabled in dropdown) + all-exams table.
// Create disabled entirely when no open term. 400 closed-term shows inline.
import { useEffect, useState, useCallback } from 'react';
import { FaSyncAlt } from 'react-icons/fa';
import { apiFetch } from '../../api/client';

const smallBtn = { padding: '0.35rem 0.9rem', fontSize: '0.85rem' };

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const [name, setName] = useState('');
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [maxScore, setMaxScore] = useState('100');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [ex, t, c, s] = await Promise.all([
        apiFetch('/exams'), apiFetch('/terms'), apiFetch('/classes'), apiFetch('/subjects'),
      ]);
      setExams(Array.isArray(ex) ? ex : []);
      setTerms(Array.isArray(t) ? t : []);
      setClasses(Array.isArray(c) ? c : []);
      setSubjects(Array.isArray(s) ? s : []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Preselect the active term once loaded
  useEffect(() => {
    if (!termId && terms.length) {
      const active = terms.find((t) => t.active && !t.closed);
      if (active) setTermId(String(active.id));
    }
  }, [terms, termId]);

  const openTerms = terms.filter((t) => !t.closed);
  const activeTerm = terms.find((t) => t.active);

  async function create(e) {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      await apiFetch('/exams', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          termId: Number(termId),
          classId: Number(classId),
          subjectId: Number(subjectId),
          maxScore: maxScore ? Number(maxScore) : undefined,
        }),
      });
      setName(''); setMaxScore('100');
      setMsg('Exam created.');
      load();
    } catch (e2) {
      setErr(e2.message); // 400 closed term
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Exams</h1>
          <div className="text-muted">
            {activeTerm ? `Active: ${activeTerm.name}${activeTerm.session_name ? ' · ' + activeTerm.session_name : ''}` : 'No active term'}
          </div>
        </div>
        <button className="btn-ghost" onClick={load}><FaSyncAlt /> Refresh</button>
      </div>

      {err && <div className="error-text">{err}</div>}
      {msg && <div className="success-text">{msg}</div>}

      {/* Create form */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="section-label">Create an exam</div>
        <form onSubmit={create} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '0.6rem' }}>
          <div style={{ flex: '1 1 200px' }}>
            <input placeholder="Exam name — e.g. First Term Exam" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div style={{ flex: '1 1 170px' }}>
            <select value={termId} onChange={(e) => setTermId(e.target.value)} required>
              <option value="">Term…</option>
              {openTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.session_name ? ` (${t.session_name})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} required>
              <option value="">Class…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
              <option value="">Subject…</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 1 90px' }}>
            <input type="number" min="1" placeholder="Max" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
          </div>
          <button className="btn-primary" style={smallBtn} disabled={openTerms.length === 0}>Create</button>
        </form>
        <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}>
          {openTerms.length === 0
            ? 'No open term — reopen a term first to create exams.'
            : 'Exams can’t be created for a closed term — reopen the term first if needed. Teachers see these exams in their Report Cards upload form, scoped to their own classes.'}
        </div>
      </div>

      {/* All exams */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="section-label">All exams — {loading ? '…' : exams.length}</div>
        <div className="table-container" style={{ marginTop: '0.75rem' }}>
          <table className="compact-table">
            <thead>
              <tr><th>Name</th><th>Class</th><th>Subject</th><th>Term</th><th>Max Score</th></tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={5}><div className="skeleton" style={{ height: '1rem' }} /></td></tr>
                ))
              ) : exams.length === 0 ? (
                <tr><td colSpan={5} className="text-muted">No exams yet — create the first one above.</td></tr>
              ) : (
                exams.map((x) => (
                  <tr key={x.id}>
                    <td><strong>{x.name}</strong></td>
                    <td>{x.class_name || '—'}</td>
                    <td>{x.subject_name || '—'}</td>
                    <td>{x.term_name || '—'}</td>
                    <td>{x.max_score}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}