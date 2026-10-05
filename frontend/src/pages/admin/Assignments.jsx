import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { apiFetch } from '../../api/client';

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [teacherId, setTeacherId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [a, t, c, s] = await Promise.all([
        apiFetch('/assignments'), apiFetch('/teachers'), apiFetch('/classes'), apiFetch('/subjects'),
      ]);
      setAssignments(a);
      setTeachers(t.filter(x => x.active));
      setClasses(c);
      setSubjects(s);
      if (t.length) setTeacherId(prev => prev || String(t.find(x => x.active)?.id || ''));
      if (c.length) setClassId(prev => prev || String(c[0].id));
      if (s.length) setSubjectId(prev => prev || String(s[0].id));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const assign = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    setBusy(true);
    try {
      await apiFetch('/assignments', {
        method: 'POST',
        body: JSON.stringify({
          teacherId: Number(teacherId), classId: Number(classId), subjectId: Number(subjectId)
        })
      });
      setMsg('Assignment created');
      await load();
    } catch (e2) {
      setErr(e2.message);   // 400 "This assignment already exists" lands here
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.15rem' }}>Teacher Assignments</h1>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
            {assignments.length} assigned — teachers can only work with their assigned classes
          </span>
        </div>
        <button className="btn-ghost" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}
      {msg && <div className="success-text" style={{ marginBottom: '0.75rem' }}>{msg}</div>}
      {err && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{err}</div>}

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Assign a teacher</h2>
        <form onSubmit={assign} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.5rem' }}>
          <select value={teacherId} onChange={e => setTeacherId(e.target.value)} required>
            <option value="" disabled>Teacher…</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
          <select value={classId} onChange={e => setClassId(e.target.value)} required>
            <option value="" disabled>Class…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={subjectId} onChange={e => setSubjectId(e.target.value)} required>
            <option value="" disabled>Subject…</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="submit" className="btn-primary" disabled={busy} style={{ whiteSpace: 'nowrap' }}>
            {busy ? '…' : 'Assign'}
          </button>
        </form>
      </div>

      <div className="card" style={{ minWidth: 0 }}>
        <h2 className="section-label" style={{ marginBottom: '1rem' }}>Current assignments</h2>
        <div className="table-container">
          <table className="compact-table">
            <thead><tr><th>Teacher</th><th>Class</th><th>Subject</th></tr></thead>
            <tbody>
              {loading && assignments.length === 0 && <tr><td colSpan="3"><div className="skeleton" style={{ height: '2.2rem' }} /></td></tr>}
              {!loading && assignments.length === 0 && <tr><td colSpan="3" className="text-muted">No assignments yet</td></tr>}
              {assignments.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.teacher_name}</td>
                  <td>{a.class_name}</td>
                  <td>{a.subject_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}