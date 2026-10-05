import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { apiFetch } from '../../api/client';

export default function Academics() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Class form
  const [className, setClassName] = useState('');
  const [classTeacherId, setClassTeacherId] = useState('');
  // Subject form
  const [subjectName, setSubjectName] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [cls, sub, tch] = await Promise.all([
        apiFetch('/classes'),
        apiFetch('/subjects'),
        apiFetch('/teachers'),
      ]);
      setClasses(cls);
      setSubjects(sub);
      setTeachers(tch.filter(t => t.active));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addClass = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      await apiFetch('/classes', {
        method: 'POST',
        body: JSON.stringify({
          name: className,
          classTeacherId: classTeacherId ? Number(classTeacherId) : undefined
        })
      });
      setClassName(''); setClassTeacherId('');
      setMsg('Class created');
      await load();
    } catch (e2) {
      setErr(e2.message);   // duplicate name → clear 400 from backend
    }
  };

  const addSubject = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      await apiFetch('/subjects', { method: 'POST', body: JSON.stringify({ name: subjectName }) });
      setSubjectName('');
      setMsg('Subject created');
      await load();
    } catch (e2) {
      setErr(e2.message);   // 409 "Subject already exists" lands here
    }
  };

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.15rem' }}>Classes & Subjects</h1>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
            {classes.length} classes · {subjects.length} subjects
          </span>
        </div>
        <button className="btn-ghost" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}
      {msg && <div className="success-text" style={{ marginBottom: '0.75rem' }}>{msg}</div>}
      {err && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: '1.25rem', alignItems: 'start' }}>
        {/* CLASSES */}
        <div className="card" style={{ minWidth: 0 }}>
          <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Classes</h2>
          <form onSubmit={addClass} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <input placeholder="Class name — e.g. JSS 1A" value={className}
                   onChange={e => setClassName(e.target.value)} required
                   style={{ flex: '2', minWidth: '140px', marginBottom: 0 }} />
            <select value={classTeacherId} onChange={e => setClassTeacherId(e.target.value)}
                    style={{ flex: '2', minWidth: '170px', marginBottom: 0 }}>
              <option value="">Class teacher (optional)</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
            <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Add</button>
          </form>
          <div className="table-container">
            <table className="compact-table">
              <thead><tr><th>Class</th><th>Class Teacher</th></tr></thead>
              <tbody>
                {loading && classes.length === 0 && <tr><td colSpan="2"><div className="skeleton" style={{ height: '2rem' }} /></td></tr>}
                {!loading && classes.length === 0 && <tr><td colSpan="2" className="text-muted">No classes yet</td></tr>}
                {classes.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.class_teacher_name || <span className="text-muted">Unassigned</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SUBJECTS */}
        <div className="card" style={{ minWidth: 0 }}>
          <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Subjects</h2>
          <form onSubmit={addSubject} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input placeholder="Subject — e.g. Mathematics" value={subjectName}
                   onChange={e => setSubjectName(e.target.value)} required style={{ marginBottom: 0 }} />
            <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Add</button>
          </form>
          <div className="table-container">
            <table className="compact-table">
              <thead><tr><th>Subject</th></tr></thead>
              <tbody>
                {loading && subjects.length === 0 && <tr><td><div className="skeleton" style={{ height: '2rem' }} /></td></tr>}
                {!loading && subjects.length === 0 && <tr><td className="text-muted">No subjects yet</td></tr>}
                {subjects.map(s => (
                  <tr key={s.id}><td style={{ fontWeight: 600 }}>{s.name}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.6rem', marginBottom: 0 }}>
            Duplicates are rejected — one Mathematics, ever.
          </p>
        </div>
      </div>
    </div>
  );
}