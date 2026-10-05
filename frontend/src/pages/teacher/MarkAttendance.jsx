import React, { useState, useEffect } from 'react';
import { FiCheck, FiX, FiClock } from 'react-icons/fi';
import { apiFetch } from '../../api/client';

export default function MarkAttendance() {
  const [myClasses, setMyClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState({});   // studentId -> present|absent|late

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cls = await apiFetch('/teacher/my-classes');
        setMyClasses(cls);
        if (cls.length) {
          const cid = String(cls[0].class_id);
          setClassId(cid);
          const stu = await apiFetch(`/teacher/class/${cid}/students`);
          setStudents(stu);
          // default everyone present — teacher unmarks as needed
          const def = {};
          stu.forEach(s => { def[s.id] = 'present'; });
          setStatuses(def);
        }
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pickClass = async (cid) => {
    setClassId(cid);
    setMsg(''); setErr('');
    try {
      const stu = await apiFetch(`/teacher/class/${cid}/students`);
      setStudents(stu);
      const def = {};
      stu.forEach(s => { def[s.id] = 'present'; });
      setStatuses(def);
    } catch (e) {
      setErr(e.message);
    }
  };

  const setStatus = (id, status) => setStatuses(prev => ({ ...prev, [id]: status }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    if (!students.length) return setErr('No students in this class');
    setBusy(true);
    try {
      const records = students.map(s => ({ studentId: s.id, status: statuses[s.id] || 'present' }));
      const data = await apiFetch('/attendance', {
        method: 'POST',
        body: JSON.stringify({ classId: Number(classId), date, records })
      });
      setMsg(data.message + ' — parents of absent students were notified.');
    } catch (e2) {
      setErr(e2.message);   // closed term → "This term is closed." lands here
    } finally {
      setBusy(false);
    }
  };

  const marked = Object.values(statuses).filter(s => s !== 'present').length;

  const StatusBtn = ({ id, value, label, icon }) => (
    <button type="button"
            className={statuses[id] === value ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setStatus(id, value)}
            title={label}
            style={{
              padding: '0.28rem 0.45rem', fontSize: '0.78rem',
              display: 'flex', alignItems: 'center',
              border: statuses[id] === value ? 'none' : '1px solid var(--border)'
            }}>
      {icon}
    </button>
  );

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ marginBottom: '0.15rem' }}>Mark Attendance</h1>
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
          {marked > 0 ? `${marked} student${marked === 1 ? '' : 's'} not marked present` : 'Everyone defaults to present'}
        </span>
      </div>

      {msg && <div className="card success-text" style={{ marginBottom: '1rem' }}>{msg}</div>}
      {err && <div className="card error-text" style={{ marginBottom: '1rem' }}>{err}</div>}

      <div className="card" style={{ minWidth: 0 }}>
        <form onSubmit={submit}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select value={classId} onChange={e => pickClass(e.target.value)} required
                    style={{ flex: 1, minWidth: '180px' }}>
              <option value="" disabled>My classes…</option>
              {myClasses.map(c => (
                <option key={`${c.class_id}-${c.subject_id}`} value={String(c.class_id)}>
                  {c.class_name} · {c.subject_name}
                </option>
              ))}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                   style={{ width: 'auto', minWidth: '160px' }} />
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: '4rem' }} />
          ) : students.length === 0 ? (
            <div className="text-muted" style={{ padding: '1rem 0' }}>
              No students in this class{classId ? ' — pick another class' : ''}.
            </div>
          ) : (
            <div className="table-container">
              <table className="compact-table">
                <thead>
                  <tr><th>Student</th><th>Admission No</th><th style={{ width: '150px' }}>Status</th></tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{s.admission_no}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <StatusBtn id={s.id} value="present" label="Present" icon={<FiCheck size={14} />} />
                          <StatusBtn id={s.id} value="absent" label="Absent" icon={<FiX size={14} />} />
                          <StatusBtn id={s.id} value="late" label="Late" icon={<FiClock size={14} />} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" disabled={busy || !classId || students.length === 0}>
              {busy ? 'Submitting…' : `Submit attendance (${students.length})`}
            </button>
          </div>
        </form>
        <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.75rem', marginBottom: 0 }}>
          Parents of absent students are notified automatically. Attendance cannot be marked for a closed term.
        </p>
      </div>
    </div>
  );
}