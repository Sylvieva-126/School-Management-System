import React, { useState, useEffect, useCallback } from 'react';
import { FiCheckCircle, FiXCircle, FiRefreshCw, FiUsers } from 'react-icons/fi';
import { apiFetch } from '../../api/client';
import { formatDate } from '../../utils/format';

export default function TeacherHome() {
  const [myClasses, setMyClasses] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [studentsByClass, setStudentsByClass] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selfMsg, setSelfMsg] = useState('');
  const [selfErr, setSelfErr] = useState('');
  const [selfBusy, setSelfBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [cls, tt, att] = await Promise.all([
        apiFetch('/teacher/my-classes'),
        apiFetch('/teacher/my-timetable'),
        apiFetch('/teacher/my-attendance'),
      ]);
      setMyClasses(cls);
      setTimetable(tt);
      setAttendance(att);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load students per class lazily (for the class cards)
  const openClassStudents = async (classId) => {
    if (studentsByClass[classId]) {
      setStudentsByClass(prev => { const c = { ...prev }; delete c[classId]; return c; });
      return;
    }
    try {
      const data = await apiFetch(`/teacher/class/${classId}/students`);
      setStudentsByClass(prev => ({ ...prev, [classId]: data }));
    } catch (e) {
      setError(e.message);
    }
  };

  const markSelf = async (status) => {
    setSelfMsg(''); setSelfErr(''); setSelfBusy(true);
    try {
      const data = await apiFetch('/teacher-attendance/mark', {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      setSelfMsg(data.message || 'Attendance marked');
      const att = await apiFetch('/teacher/my-attendance');
      setAttendance(att);
    } catch (e) {
      setSelfErr(e.message);
    } finally {
      setSelfBusy(false);
    }
  };

  // FIX: backend returns dates as full ISO timestamps ("2026-10-04T00:00:00Z")
  // — compare the first 10 chars against today's bare date, or it never matches.
  const today = new Date().toISOString().slice(0, 10);
  const todayMarked = attendance?.records?.[0] && String(attendance.records[0].date).slice(0, 10) === today
    ? attendance.records[0].status
    : null;

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const byDay = DAYS.map(d => ({ day: d, rows: timetable.filter(x => x.day_of_week === d) }));

  if (loading) return <div className="card">Loading…</div>;

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.15rem' }}>Teacher Home</h1>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
            {myClasses.length} class assignment{myClasses.length === 1 ? '' : 's'}
          </span>
        </div>
        <button className="btn-ghost" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* ===== SELF ATTENDANCE ===== */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="section-label" style={{ marginBottom: '0.35rem' }}>Mark my attendance — today</h2>
            {selfMsg && <div className="success-text" style={{ marginTop: 0 }}>{selfMsg}</div>}
            {selfErr && <div className="error-text" style={{ marginTop: 0 }}>{selfErr}</div>}
            {!selfMsg && !selfErr && (
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                {todayMarked
                  ? <>Already marked today: <strong style={{ textTransform: 'capitalize' }}>{todayMarked}</strong> (marking again overwrites)</>
                  : 'Not marked yet today'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {attendance && (
              <div style={{ textAlign: 'center', marginRight: '0.5rem' }}>
                <div className="section-label" style={{ fontSize: '0.62rem' }}>My rate</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: attendance.percentage >= 75 ? 'var(--success)' : 'var(--danger)' }}>
                  {attendance.percentage}%
                </div>
              </div>
            )}
            <button className="btn-primary" disabled={selfBusy} onClick={() => markSelf('present')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <FiCheckCircle size={15} /> Present
            </button>
            <button className="btn-danger" disabled={selfBusy} onClick={() => markSelf('absent')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <FiXCircle size={15} /> Absent
            </button>
          </div>
        </div>
        {attendance?.records?.length > 0 && (
          <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.6rem' }}>
            Recent: {attendance.records.slice(0, 7).map(r =>
              `${formatDate(r.date)} (${r.status})`).join(' · ')}
          </div>
        )}
      </div>

      {/* ===== MY CLASSES ===== */}
      <div className="card" style={{ marginBottom: '1.25rem', minWidth: 0 }}>
        <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>My classes</h2>
        {myClasses.length === 0 ? (
          <div className="text-muted">No assignments yet — an admin assigns you to classes.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
            {myClasses.map(c => {
              const key = `${c.class_id}-${c.subject_id}`;
              const students = studentsByClass[c.class_id];
              return (
                <div key={key} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700 }}>{c.class_name}</div>
                    <span className="badge badge-primary">{c.subject_name}</span>
                  </div>
                  <button className="btn-ghost" onClick={() => openClassStudents(c.class_id)}
                          style={{ fontSize: '0.78rem', padding: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <FiUsers size={12} /> {students ? `${students.length} students` : 'Show students'}
                  </button>
                  {students && (
                    <div style={{ fontSize: '0.8rem', marginTop: '0.35rem', maxHeight: '150px', overflowY: 'auto' }}>
                      {students.map(s => (
                        <div key={s.id} style={{ padding: '0.15rem 0', borderBottom: '1px solid var(--border)' }}>
                          {s.full_name} <span className="text-muted">({s.admission_no})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== MY TIMETABLE ===== */}
      <div className="card" style={{ minWidth: 0 }}>
        <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>My timetable</h2>
        {timetable.length === 0 ? (
          <div className="text-muted">No periods scheduled for you yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
            {byDay.map(({ day, rows }) => (
              <div key={day}>
                <div className="section-label" style={{ marginBottom: '0.5rem' }}>{day}</div>
                {rows.length === 0 ? (
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>—</div>
                ) : (
                  rows.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(x => (
                    <div key={x.id} style={{
                      borderLeft: '3px solid var(--primary)', padding: '0.4rem 0.7rem',
                      marginBottom: '0.5rem', background: 'var(--surface-2)', borderRadius: '0 8px 8px 0'
                    }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{x.class_name}</div>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                        {String(x.start_time).slice(0, 5)}–{String(x.end_time).slice(0, 5)} · {x.subject_name}
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