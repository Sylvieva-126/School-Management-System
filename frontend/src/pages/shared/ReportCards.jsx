// src/pages/shared/ReportCards.jsx — Tier 1, build item 6. ONE page serves
// BOTH /admin/report-cards and /teacher/report-cards (checks role itself).
// ADMIN: pending table -> Review (blob download to inspect) + Publish
//        (confirm -> notifies student + parents). Empty: "Nothing pending".
// TEACHER: upload form — class·subject from /teacher/my-classes ONLY
//        (NEVER GET /exams as teacher -> 403, gotcha #4); students +
//        /exams/my scoped loads; styled dashed file input; apiUpload;
//        reset file state after success.
import { useEffect, useState, useCallback, useRef } from 'react';
import { FaSyncAlt, FaCloudUploadAlt, FaUpload } from 'react-icons/fa';
import { apiFetch, apiUpload } from '../../api/client';
import { formatDateTime } from '../../utils/format';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../auth/AuthContext';

const smallBtn = { padding: '0.3rem 0.7rem', fontSize: '0.82rem' };

export default function ReportCards() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  return isAdmin ? <AdminPanel /> : <TeacherPanel />;
}

/* ---------------- ADMIN: review + publish ---------------- */
function AdminPanel() {
  const [items, setItems] = useState(null); // null = loading
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [target, setTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setErr(''); setMsg('');
    try {
      const d = await apiFetch('/report-cards/pending');
      setItems(Array.isArray(d) ? d : []);
    } catch (e) {
      setErr(e.message);
      setItems([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function review(r) {
    setErr(''); setMsg('');
    try {
      const blob = await apiFetch(`/report-cards/${r.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = r.file_name || `report-card-${r.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function doPublish() {
    const r = target;
    setTarget(null);
    setBusyId(r.id); setErr(''); setMsg('');
    try {
      await apiFetch(`/report-cards/${r.id}/publish`, { method: 'POST' });
      setMsg('Published — the student and their parents have been notified.');
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Report Cards</h1>
          <div className="text-muted">Review teacher uploads and publish them to students and parents</div>
        </div>
        <button className="btn-ghost" onClick={load}><FaSyncAlt /> Refresh</button>
      </div>

      {err && <div className="error-text">{err}</div>}
      {msg && <div className="success-text">{msg}</div>}

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="section-label">Pending review — {items === null ? '…' : items.length}</div>

        <div className="table-container" style={{ marginTop: '0.75rem' }}>
          <table className="compact-table">
            <thead>
              <tr>
                <th>Student</th><th>Admission No</th><th>Exam</th><th>Teacher</th><th>Uploaded</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items === null ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}><td colSpan={6}><div className="skeleton" style={{ height: '1rem' }} /></td></tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="text-muted">Nothing pending — teacher uploads will appear here for review.</td></tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.student_name}</strong></td>
                    <td>{r.admission_no}</td>
                    <td>{r.exam_name}</td>
                    <td>{r.teacher_name}</td>
                    <td className="text-muted">{formatDateTime(r.uploaded_at)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn-ghost" style={smallBtn} onClick={() => review(r)}>Review</button>{' '}
                      <button className="btn-primary" style={smallBtn} disabled={busyId === r.id} onClick={() => setTarget(r)}>
                        {busyId === r.id ? 'Publishing…' : 'Publish'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.6rem' }}>
          Publishing notifies the student and their parents and makes the card downloadable from their portals.
        </div>
      </div>

      <ConfirmDialog
        open={!!target}
        title="Publish report card"
        message={`Publish ${target?.exam_name} for ${target?.student_name}? The student and their parents will be notified, and the card becomes downloadable from their portals.`}
        confirmText="Publish"
        danger={false}
        onConfirm={doPublish}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}

/* ---------------- TEACHER: upload ---------------- */
function TeacherPanel() {
  const [classes, setClasses] = useState([]);        // /teacher/my-classes rows
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [classKey, setClassKey] = useState('');      // `${class_id}:${subject_id}`
  const [studentId, setStudentId] = useState('');
  const [examId, setExamId] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    apiFetch('/teacher/my-classes')
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setClasses(list);
        // Gotcha #7: an auto-selected dropdown must TRIGGER its dependent
        // loads — setting state via setClassKey does exactly that (effect below).
        if (list.length === 1) setClassKey(`${list[0].class_id}:${list[0].subject_id}`);
      })
      .catch((e) => setErr(e.message));
  }, []);

  // Class·Subject change -> load students AND teacher-scoped exams
  useEffect(() => {
    if (!classKey) return;
    const [classId, subjectId] = classKey.split(':');
    setStudents([]); setExams([]); setStudentId(''); setExamId('');
    Promise.all([
      apiFetch(`/teacher/class/${classId}/students`),
      apiFetch(`/exams/my?classId=${classId}&subjectId=${subjectId}`),
    ])
      .then(([s, x]) => {
        setStudents(Array.isArray(s) ? s : []);
        setExams(Array.isArray(x) ? x : []);
      })
      .catch((e) => setErr(e.message));
  }, [classKey]);

  function pickFile(f) {
    setErr(''); setMsg('');
    if (!f) return;
    const ok = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!ok.includes(f.type)) { setErr('Only PDF, PNG, or JPEG files are allowed.'); return; }
    if (f.size > 5 * 1024 * 1024) { setErr('File is larger than the 5MB limit.'); return; }
    setFile(f);
  }

  async function submit(e) {
    e.preventDefault();
    if (!file) { setErr('Choose a file first.'); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      const fd = new FormData();
      fd.append('studentId', studentId);
      fd.append('examId', examId);
      fd.append('file', file);
      await apiUpload('/report-cards/upload', fd);
      setMsg('Report card uploaded — the school will review and publish it.');
      setFile(null); setStudentId(''); setExamId('');
      if (inputRef.current) inputRef.current.value = ''; // reset file state fully
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Report Cards</h1>
      <div className="text-muted">Upload report cards for your classes — the school reviews and publishes them</div>

      {err && <div className="error-text">{err}</div>}
      {msg && <div className="success-text">{msg}</div>}

      <div className="card" style={{ marginTop: '1rem', maxWidth: 520 }}>
        <div className="section-label">Upload a report card</div>
        <form onSubmit={submit} style={{ marginTop: '0.75rem' }}>
          <label>Class · Subject</label>
          <select value={classKey} onChange={(e) => setClassKey(e.target.value)} required>
            <option value="">{classes.length ? 'Select…' : 'Loading your classes…'}</option>
            {classes.map((c) => (
              <option key={`${c.class_id}:${c.subject_id}`} value={`${c.class_id}:${c.subject_id}`}>
                {c.class_name} · {c.subject_name}
              </option>
            ))}
          </select>

          <label style={{ marginTop: '0.9rem' }}>Student</label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required disabled={!classKey}>
            <option value="">{classKey ? 'Select student…' : 'Pick a class first'}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name} — {s.admission_no}</option>
            ))}
          </select>

          <label style={{ marginTop: '0.9rem' }}>Exam</label>
          <select value={examId} onChange={(e) => setExamId(e.target.value)} required disabled={!classKey}>
            <option value="">{classKey ? 'Select exam…' : 'Pick a class first'}</option>
            {exams.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>

          <label style={{ marginTop: '0.9rem' }}>Report card file (PDF, PNG, or JPEG — max 5MB)</label>
          <label
            htmlFor="rc-file"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              border: '2px dashed var(--border)', borderRadius: 8,
              padding: '0.9rem', cursor: 'pointer', color: 'var(--text-muted)',
              fontWeight: 500,
            }}
          >
            <FaCloudUploadAlt />
            {file ? file.name : 'Choose file — PDF, PNG, or JPEG'}
          </label>
          <input
            ref={inputRef}
            id="rc-file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={(e) => pickFile(e.target.files?.[0])}
          />

          {err && <div className="error-text">{err}</div>}
          {msg && <div className="success-text">{msg}</div>}

          <button
            className="btn-primary"
            disabled={busy || !studentId || !examId || !file}
            style={{ marginTop: '1rem' }}
          >
            <FaUpload /> {busy ? 'Uploading…' : 'Upload'}
          </button>
        </form>
        <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.6rem' }}>
          Only students in your own classes — enforced here and by the backend.
        </div>
      </div>
    </div>
  );
}