import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { apiFetch } from '../../api/client';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetablePage() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [filterClassId, setFilterClassId] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:40');
  const [busy, setBusy] = useState(false);

  const loadBase = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [cls, sub, tch] = await Promise.all([
        apiFetch('/classes'), apiFetch('/subjects'), apiFetch('/teachers'),
      ]);
      setClasses(cls);
      setSubjects(sub);
      setTeachers(tch.filter(t => t.active));
      if (cls.length) {
        setClassId(prev => prev || String(cls[0].id));
        setFilterClassId(prev => prev || String(cls[0].id));
      }
      if (tch.length) setTeacherId(prev => prev || String(tch.find(t => t.active)?.id || ''));
      if (sub.length) setSubjectId(prev => prev || String(sub[0].id));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEntries = useCallback(async (cid) => {
    if (!cid) { setEntries([]); return; }
    try {
      const data = await apiFetch(`/timetable?classId=${cid}`);
      setEntries(data);
    } catch (e) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);
  useEffect(() => { loadEntries(filterClassId); }, [filterClassId, loadEntries]);

  const addEntry = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    setBusy(true);
    try {
      await apiFetch('/timetable', {
        method: 'POST',
        body: JSON.stringify({
          classId: Number(classId), teacherId: Number(teacherId),
          subjectId: Number(subjectId), dayOfWeek,
          startTime, endTime
        })
      });
      setMsg('Period added');
      await loadEntries(filterClassId);
    } catch (e2) {
      setErr(e2.message);   // 409 clash: "this class or teacher is already booked"
    } finally {
      setBusy(false);
    }
  };

  const byDay = DAYS.map(d => ({ day: d, rows: entries.filter(x => x.day_of_week === d) }));

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.15rem' }}>Timetable</h1>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
            {entries.length} periods {filterClassId ? `for ${classes.find(c => String(c.id) === filterClassId)?.name || ''}` : ''}
          </span>
        </div>
        <button className="btn-ghost" onClick={() => { loadBase(); loadEntries(filterClassId); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}
      {msg && <div className="success-text" style={{ marginBottom: '0.75rem' }}>{msg}</div>}
      {err && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{err}</div>}

      {/* CREATE */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Add a period</h2>
        <form onSubmit={addEntry} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
          <select value={classId} onChange={e => setClassId(e.target.value)} required>
            <option value="" disabled>Class…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={subjectId} onChange={e => setSubjectId(e.target.value)} required>
            <option value="" disabled>Subject…</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={teacherId} onChange={e => setTeacherId(e.target.value)} required>
            <option value="" disabled>Teacher…</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
          <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} required>
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required title="Start time" />
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required title="End time" />
          <button type="submit" className="btn-primary" disabled={busy} style={{ whiteSpace: 'nowrap' }}>
            {busy ? '…' : 'Add'}
          </button>
        </form>
        <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.6rem', marginBottom: 0 }}>
          Double-bookings are rejected — the same class or teacher can't be in two places at once.
        </p>
      </div>

      {/* CLASS FILTER */}
      <div className="card" style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          <h2 className="section-label" style={{ margin: 0 }}>Weekly view</h2>
          <select value={filterClassId} onChange={e => setFilterClassId(e.target.value)} style={{ width: 'auto', minWidth: '160px', marginBottom: 0 }}>
            <option value="" disabled>Filter class…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {byDay.every(d => d.rows.length === 0) ? (
          <div className="text-muted" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            No periods yet for this class — add the first one above.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
            {byDay.map(({ day, rows }) => (
              <div key={day}>
                <div className="section-label" style={{ marginBottom: '0.5rem' }}>{day}</div>
                {rows.length === 0 ? (
                  <div className="text-muted" style={{ fontSize: '0.8rem', padding: '0.4rem 0' }}>—</div>
                ) : (
                  rows.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(x => (
                    <div key={x.id} style={{
                      borderLeft: '3px solid var(--primary)',
                      padding: '0.4rem 0.7rem', marginBottom: '0.5rem',
                      background: 'var(--surface-2)', borderRadius: '0 8px 8px 0'
                    }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{x.subject_name}</div>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                        {x.start_time.slice(0, 5)}–{x.end_time.slice(0, 5)} · {x.teacher_name}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}