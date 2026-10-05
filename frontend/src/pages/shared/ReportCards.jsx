import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw, FiUpload, FiCheckCircle } from 'react-icons/fi';
import { apiFetch, apiUpload } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { formatDateTime } from '../../utils/format';

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

/* ================= TEACHER: UPLOAD ================= */
function TeacherUpload() {
  const [myClasses, setMyClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);

  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [examId, setExamId] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const sel = { width: '100%', maxWidth: '100%', minWidth: 0 };

  useEffect(() => {
    (async () => {
      try {
        const cls = await apiFetch('/teacher/my-classes');
        setMyClasses(cls);
        if (cls.length) {
          const cid = String(cls[0].class_id);
          const sid = String(cls[0].subject_id);
          setClassId(cid);
          setSubjectId(sid);
          // Fetch students + exams for the auto-selected first class
          const [stu, exs] = await Promise.all([
            apiFetch(`/teacher/class/${cid}/students`),
            apiFetch(`/exams/my?classId=${cid}&subjectId=${sid}`),
          ]);
          setStudents(stu);
          setExams(exs);
        }
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, []);

  const pickClass = async (cid, sid) => {
    setStudentId('');
    setExamId('');
    setStudents([]);
    setExams([]);
    if (!cid) return;
    try {
      const [stu, exs] = await Promise.all([
        apiFetch(`/teacher/class/${cid}/students`),
        apiFetch(`/exams/my?classId=${cid}${sid ? `&subjectId=${sid}` : ''}`),
      ]);
      setStudents(stu);
      setExams(exs);
    } catch (e) {
      setErr(e.message);
    }
  };

  const onClassChange = (cid) => {
    setClassId(cid);
    const found = myClasses.find(c => String(c.class_id) === cid);
    const sid = found ? String(found.subject_id) : '';
    setSubjectId(sid);
    pickClass(cid, sid);
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    if (!file) return setErr('Choose a PDF, PNG, or JPEG file');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('studentId', studentId);
      fd.append('examId', examId);
      fd.append('file', file);
      const data = await apiUpload('/report-cards/upload', fd);
      setMsg(data.message || 'Uploaded');
      setFile(null);
      setFileName('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ width: '100%', maxWidth: '560px' }}>
      <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Upload a report card</h2>
      {msg && <div className="success-text" style={{ marginBottom: '0.75rem' }}>{msg}</div>}
      {err && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{err}</div>}
      <form onSubmit={submit}>
        <div style={{ marginBottom: '0.9rem' }}>
          <label>Class · Subject</label>
          <select value={classId} onChange={e => onClassChange(e.target.value)} required style={sel}>
            <option value="" disabled>My classes…</option>
            {myClasses.map(c => (
              <option key={`${c.class_id}-${c.subject_id}`} value={String(c.class_id)}>
                {c.class_name} · {c.subject_name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '0.9rem' }}>
          <label>Student</label>
          <select value={studentId} onChange={e => setStudentId(e.target.value)} required disabled={!classId} style={sel}>
            <option value="" disabled>{students.length ? 'Select student…' : 'Pick a class first'}</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.full_name} ({s.admission_no})</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '0.9rem' }}>
          <label>Exam</label>
          <select value={examId} onChange={e => setExamId(e.target.value)} required disabled={!classId} style={sel}>
            <option value="" disabled>
              {exams.length ? 'Select exam…' : 'No exam for this class yet — ask an admin to create one'}
            </option>
            {exams.map(x => <option key={x.id} value={x.id}>{x.name} ({x.term_name})</option>)}
          </select>
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label>Report card file (PDF, PNG, or JPEG — max 5MB)</label>
          <input
            id="rc-file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={e => {
              const f = e.target.files[0];
              setFile(f);
              setFileName(f ? f.name : '');
            }}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
          />
          <label htmlFor="rc-file" className="btn-ghost"
                 style={{
                   display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                   width: '100%', cursor: 'pointer',
                   border: '1px dashed var(--border)', borderRadius: 8, padding: '0.65rem 0.9rem'
                 }}>
            <FiUpload size={15} />
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: fileName ? 'var(--text)' : 'var(--text-muted)'
            }}>
              {fileName || 'Choose file — PDF, PNG, or JPEG'}
            </span>
          </label>
        </div>
        <button type="submit" className="btn-primary" disabled={busy || !studentId || !examId}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FiUpload size={15} /> {busy ? 'Uploading…' : 'Upload'}
        </button>
      </form>
      <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.75rem', marginBottom: 0 }}>
        Only students in your own classes — enforced here and by the backend.
      </p>
    </div>
  );
}

/* ================= ADMIN: PENDING QUEUE + PUBLISH ================= */
function AdminPending() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/report-cards/pending');
      setPending(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const publish = async (r) => {
    setActionMsg(''); setActionErr('');
    if (!window.confirm(`Publish report card for ${r.student_name} (${r.exam_name})?\nThe student and their parents will be notified.`)) return;
    setBusyId(r.id);
    try {
      await apiFetch(`/report-cards/${r.id}/publish`, { method: 'POST' });
      setActionMsg(`Published for ${r.student_name} — student and parents notified`);
      await load();
    } catch (err) {
      setActionErr(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const preview = async (r) => {
    try {
      await downloadReportCard(r.id, r.file_name);
    } catch (err) {
      setActionErr(err.message);
    }
  };

  return (
    <div className="card" style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="section-label" style={{ margin: 0 }}>Pending review — {pending.length}</h2>
        <button className="btn-ghost" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>
      {error && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{error}</div>}
      {actionMsg && <div className="success-text" style={{ marginBottom: '0.75rem' }}>{actionMsg}</div>}
      {actionErr && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{actionErr}</div>}

      <div className="table-container">
        <table className="compact-table">
          <thead>
            <tr>
              <th>Student</th><th>Admission No</th><th>Exam</th><th>Teacher</th><th>Uploaded</th><th style={{ width: '1%' }}></th>
            </tr>
          </thead>
          <tbody>
            {loading && pending.length === 0 && (
              <tr><td colSpan="6"><div className="skeleton" style={{ height: '2.2rem' }} /></td></tr>
            )}
            {!loading && pending.length === 0 && (
              <tr>
                <td colSpan="6">
                  <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <FiCheckCircle size={22} color="var(--success)" style={{ marginBottom: '0.4rem' }} />
                    <div style={{ fontWeight: 600 }}>Nothing pending</div>
                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                      All uploaded report cards have been reviewed and published.
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {pending.map(r => (
              <tr key={r.id}>
                <td className="cell-truncate" title={r.student_name} style={{ fontWeight: 600 }}>{r.student_name}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{r.admission_no}</td>
                <td>{r.exam_name}</td>
                <td className="cell-truncate" title={r.teacher_name}>{r.teacher_name}</td>
                <td className="text-muted" style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{formatDateTime(r.uploaded_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                    <button className="btn-ghost" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', border: '1px solid var(--border)' }}
                            onClick={() => preview(r)} title="Download and inspect before publishing">
                      Review
                    </button>
                    <button className="btn-primary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
                            disabled={busyId === r.id}
                            onClick={() => publish(r)}>
                      {busyId === r.id ? '…' : 'Publish'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.75rem', marginBottom: 0 }}>
        Publishing notifies the student and their parents and makes the card downloadable from their portals.
      </p>
    </div>
  );
}

/* ================= PAGE: role-switched ================= */
export default function ReportCards() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ marginBottom: '0.15rem' }}>Report Cards</h1>
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
          {isAdmin
            ? 'Review teacher uploads and publish them to students and parents'
            : 'Upload report cards for your classes — the school reviews and publishes them'}
        </span>
      </div>
      {isAdmin ? <AdminPending /> : <TeacherUpload />}
    </div>
  );
}