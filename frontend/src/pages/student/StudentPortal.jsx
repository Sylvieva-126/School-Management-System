import React, { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiRefreshCw } from 'react-icons/fi';
import { apiFetch } from '../../api/client';
import { formatNaira } from '../../utils/format';

// Authenticated blob download — report cards need the Bearer token
async function downloadReportCard(id, fileName) {
  const blob = await apiFetch(`/report-cards/${id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || `report-card-${id}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function StudentPortal() {
  const [fees, setFees] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [reportCards, setReportCards] = useState([]);
  const [classTeacher, setClassTeacher] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dlErr, setDlErr] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [f, tt, att, rc] = await Promise.all([
        apiFetch('/student/me/fees'),
        apiFetch('/student/me/timetable'),
        apiFetch('/student/me/attendance-percentage'),
        apiFetch('/student/me/report-cards'),
      ]);
      setFees(f);
      setTimetable(tt);
      setAttendance(att.percentage);
      setReportCards(rc);
      // class teacher name rides on any timetable row
      setClassTeacher(tt[0]?.class_teacher_name || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalBalance = fees.reduce((sum, f) => sum + Number(f.balance || 0), 0);
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const byDay = DAYS.map(d => ({ day: d, rows: timetable.filter(x => x.day_of_week === d) }));

  if (loading) return <div className="card">Loading your portal…</div>;

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.15rem' }}>My Portal</h1>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
            {classTeacher ? <>Class teacher: <strong>{classTeacher}</strong></> : 'No class teacher assigned yet'}
          </span>
        </div>
        <button className="btn-ghost" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}
      {dlErr && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{dlErr}</div>}

      {/* Quick facts strip */}
      <div className="card" style={{ padding: 0, marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 150px', padding: '0.9rem 1.25rem', borderLeft: '1px solid var(--border)' }}>
          <div className="section-label">Attendance</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: attendance >= 75 ? 'var(--success)' : 'var(--danger)' }}>
            {attendance ?? '—'}%
          </div>
        </div>
        <div style={{ flex: '1 1 150px', padding: '0.9rem 1.25rem', borderLeft: '1px solid var(--border)' }}>
          <div className="section-label">Outstanding fees</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: totalBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {formatNaira(totalBalance)}
          </div>
        </div>
        <div style={{ flex: '1 1 150px', padding: '0.9rem 1.25rem', borderLeft: '1px solid var(--border)' }}>
          <div className="section-label">Report cards</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{reportCards.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
        {/* FEES */}
        <div className="card" style={{ minWidth: 0 }}>
          <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>My fees</h2>
          <div className="table-container">
            <table className="compact-table">
              <thead><tr><th>Term</th><th>Billed</th><th>Balance</th></tr></thead>
              <tbody>
                {fees.length === 0 && <tr><td colSpan="3" className="text-muted">No fees billed yet</td></tr>}
                {fees.map(f => (
                  <tr key={f.id}>
                    <td>{f.term_name}</td>
                    <td>{formatNaira(f.amount)}</td>
                    <td style={{ fontWeight: 700, color: Number(f.balance) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {formatNaira(f.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* REPORT CARDS */}
        <div className="card" style={{ minWidth: 0 }}>
          <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>My report cards</h2>
          {reportCards.length === 0 ? (
            <div className="text-muted" style={{ padding: '0.75rem 0' }}>
              No report cards published yet — you'll get a notification when one is ready.
            </div>
          ) : (
            reportCards.map(r => (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.6rem 0.75rem', marginBottom: '0.5rem',
                background: 'var(--surface-2)', borderRadius: 8
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.exam_name}</div>
                  <div className="text-muted" style={{ fontSize: '0.78rem' }}>{r.term_name}</div>
                </div>
                <button className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        onClick={() => { setDlErr(''); downloadReportCard(r.id, r.file_name).catch(e => setDlErr(e.message)); }}>
                  <FiDownload size={13} /> Download
                </button>
              </div>
            ))
          )}
        </div>

        {/* TIMETABLE — full width row */}
        <div className="card" style={{ minWidth: 0, gridColumn: '1 / -1' }}>
          <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>My timetable</h2>
          {timetable.length === 0 ? (
            <div className="text-muted">No timetable yet for your class.</div>
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
                        borderLeft: '3px solid var(--primary)',
                        padding: '0.4rem 0.7rem', marginBottom: '0.5rem',
                        background: 'var(--surface-2)', borderRadius: '0 8px 8px 0'
                      }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{x.subject_name}</div>
                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                          {String(x.start_time).slice(0, 5)}–{String(x.end_time).slice(0, 5)} · {x.teacher_name}
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
    </div>
  );
}