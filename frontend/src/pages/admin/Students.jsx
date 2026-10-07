// src/pages/admin/Students.jsx — Tier 1, build item 3.
// Admit -> copyable link boxes (the user's ONLY password setup method —
// "expires in 24 hours, shown once"). Search + pagination. ICON-ONLY row
// actions: Move class (inline panel = manual promotion), Reset PW
// (copyable link), Graduate (SS3 only, 400 shows inline), Remove (confirm).
import { useEffect, useState, useCallback } from 'react';
import {
  FaSyncAlt, FaSearch, FaArrowsAlt, FaKey, FaUserGraduate, FaUserTimes, FaTimes,
} from 'react-icons/fa';
import { apiFetch } from '../../api/client';
import CopyBox from '../../components/CopyBox';
import ConfirmDialog from '../../components/ConfirmDialog';

const iconBtn = { padding: '0.35rem 0.5rem', fontSize: '0.85rem' };

export default function Students() {
  // list state
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const [activeQ, setActiveQ] = useState('');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  // admit form
  const [fullName, setFullName] = useState('');
  const [admitClassId, setAdmitClassId] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [admitting, setAdmitting] = useState(false);
  const [admitResult, setAdmitResult] = useState(null);

  // row actions
  const [moveRow, setMoveRow] = useState(null);      // { student, classId }
  const [resetInfo, setResetInfo] = useState(null);  // { name, link }
  const [graduateTarget, setGraduateTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const d = await apiFetch(`/students?q=${encodeURIComponent(activeQ)}&page=${page}`);
      setItems(d.items || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeQ, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    apiFetch('/classes')
      .then((d) => setClasses(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  function submitSearch(e) {
    e.preventDefault();
    setPage(1);
    setActiveQ(qInput.trim());
  }

  async function admit(e) {
    e.preventDefault();
    setErr(''); setMsg(''); setAdmitResult(null);
    setAdmitting(true);
    try {
      const d = await apiFetch('/students', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          classId: Number(admitClassId),
          parentName: parentName.trim(),
          parentPhone: parentPhone.trim(),
        }),
      });
      setAdmitResult(d); // { admissionNo, studentActivationLink, parentActivationLink? }
      setFullName(''); setAdmitClassId(''); setParentName(''); setParentPhone('');
      setPage(1);
      load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setAdmitting(false);
    }
  }

  async function moveStudent() {
    const { student, classId: newClassId } = moveRow;
    setBusy(true); setErr(''); setMsg('');
    try {
      await apiFetch(`/students/${student.id}/class`, {
        method: 'PATCH',
        body: JSON.stringify({ classId: Number(newClassId) }),
      });
      const cls = classes.find((c) => String(c.id) === String(newClassId));
      setMsg(`${student.full_name} moved to ${cls ? cls.name : 'the new class'}.`);
      setMoveRow(null);
      load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(s) {
    setErr(''); setMsg('');
    try {
      const d = await apiFetch(`/students/${s.id}/reset-password`, { method: 'POST' });
      setResetInfo({ name: s.full_name, link: d.resetLink });
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function doGraduate() {
    const s = graduateTarget;
    setGraduateTarget(null);
    setBusy(true); setErr(''); setMsg('');
    try {
      await apiFetch(`/students/${s.id}/graduate`, { method: 'PATCH' });
      setMsg(`${s.full_name} graduated — their login is now locked.`);
      load();
    } catch (e2) {
      setErr(e2.message); // 400 if not in SS3 — shown, per her spec
    } finally {
      setBusy(false);
    }
  }

  async function doRemove() {
    const s = removeTarget;
    setRemoveTarget(null);
    setBusy(true); setErr(''); setMsg('');
    try {
      await apiFetch(`/students/${s.id}/deactivate`, { method: 'PATCH' });
      setMsg(`${s.full_name} removed.`);
      load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Students</h1>
          <div className="text-muted">{total} enrolled</div>
        </div>
        <button className="btn-ghost" onClick={load}><FaSyncAlt /> Refresh</button>
      </div>

      {err && <div className="error-text">{err}</div>}
      {msg && <div className="success-text">{msg}</div>}

      {/* Admit result — copyable boxes, shown ONCE (her spec) */}
      {admitResult && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Student admitted — save these now</h3>
            <button className="btn-ghost" style={iconBtn} title="Dismiss" onClick={() => setAdmitResult(null)}>
              <FaTimes />
            </button>
          </div>
          <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0 0.9rem' }}>
            These links expire in <strong>24 hours</strong> and are shown <strong>only once</strong>.
            The student and parent use them to set their own passwords.
          </p>
          <CopyBox label="Admission number" value={admitResult.admissionNo} />
          <CopyBox label="Student activation link" value={admitResult.studentActivationLink} />
          {admitResult.parentActivationLink ? (
            <CopyBox label="Parent activation link" value={admitResult.parentActivationLink} />
          ) : (
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              Parent already had an account — no new parent link needed (siblings share one login).
            </p>
          )}
        </div>
      )}

      {/* Reset-password result */}
      {resetInfo && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Password reset — {resetInfo.name}</h3>
            <button className="btn-ghost" style={iconBtn} title="Dismiss" onClick={() => setResetInfo(null)}>
              <FaTimes />
            </button>
          </div>
          <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0 0.9rem' }}>
            Give this link to the student. It expires in 24 hours and is shown once.
          </p>
          <CopyBox label="Reset link" value={resetInfo.link} />
        </div>
      )}

      {/* Admit form */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="section-label">Admit a student</div>
        <form onSubmit={admit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '0.6rem' }}>
          <div style={{ flex: '1 1 170px' }}>
            <label>Full name</label>
            <input placeholder="e.g. Tunde Ade" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label>Class</label>
            <select value={admitClassId} onChange={(e) => setAdmitClassId(e.target.value)} required>
              <option value="">Select…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 170px' }}>
            <label>Parent name</label>
            <input placeholder="e.g. Mr. Ade" value={parentName} onChange={(e) => setParentName(e.target.value)} required />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label>Parent phone</label>
            <input placeholder="080…" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} required />
          </div>
          <button className="btn-primary" disabled={admitting || classes.length === 0} style={{ padding: '0.5rem 2rem' }}>
            {admitting ? 'Admitting…' : 'Admit'}
          </button>
        </form>
        <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}>
          Admission number is generated automatically. Same parent phone reuses the parent account — siblings share one login.
        </div>
      </div>

      {/* Search + table */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <form onSubmit={submitSearch} style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FaSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              placeholder="Search name or admission number…"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              style={{ paddingLeft: '2.2rem' }}
            />
          </div>
          <button className="btn-primary">Search</button>
        </form>

        <div className="table-container" style={{ marginTop: '0.9rem' }}>
          <table className="compact-table">
            <thead>
              <tr>
                <th>Admission No</th>
                <th>Name</th>
                <th>Class</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={5}><div className="skeleton" style={{ height: '1rem' }} /></td></tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted">
                    {activeQ ? `No students match “${activeQ}”.` : 'No students yet — admit the first one above.'}
                  </td>
                </tr>
              ) : (
                items.map((s) => (
                  <>
                    <tr key={s.id}>
                      <td>{s.admission_no}</td>
                      <td><strong>{s.full_name}</strong></td>
                      <td>{s.class_name || '—'}</td>
                      <td>
                        {s.graduated
                          ? <span className="badge badge-primary">Graduated</span>
                          : <span className="badge badge-success">Enrolled</span>}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn-ghost" style={iconBtn} title="Move class (promotion)" onClick={() => setMoveRow({ student: s, classId: '' })}>
                          <FaArrowsAlt />
                        </button>
                        <button className="btn-ghost" style={iconBtn} title="Reset password" onClick={() => resetPassword(s)}>
                          <FaKey />
                        </button>
                        <button className="btn-ghost" style={iconBtn} title="Graduate (SS3 only)" onClick={() => setGraduateTarget(s)}>
                          <FaUserGraduate />
                        </button>
                        <button className="btn-ghost" style={{ ...iconBtn, color: 'var(--danger)' }} title="Remove student" onClick={() => setRemoveTarget(s)}>
                          <FaUserTimes />
                        </button>
                      </td>
                    </tr>
                    {/* Inline move-class panel (manual promotion) */}
                    {moveRow?.student?.id === s.id && (
                      <tr key={`move-${s.id}`}>
                        <td colSpan={5} style={{ backgroundColor: 'var(--surface-2)' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.9rem' }}>Move {moveRow.student.full_name} to:</strong>
                            <select
                              value={moveRow.classId}
                              onChange={(e) => setMoveRow({ ...moveRow, classId: e.target.value })}
                              style={{ maxWidth: 220 }}
                            >
                              <option value="">Select new class…</option>
                              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button className="btn-primary" style={iconBtn} disabled={!moveRow.classId || busy} onClick={moveStudent}>
                              Move
                            </button>
                            <button className="btn-ghost" style={iconBtn} onClick={() => setMoveRow(null)}>
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>Page {page} of {pages}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-ghost" style={iconBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
              <button className="btn-ghost" style={iconBtn} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* confirm() before destructive actions */}
      <ConfirmDialog
        open={!!graduateTarget}
        title="Graduate student"
        message={`Graduate ${graduateTarget?.full_name}? This locks their login permanently. Only SS3 students can graduate.`}
        confirmText="Graduate"
        onConfirm={doGraduate}
        onCancel={() => setGraduateTarget(null)}
      />
      <ConfirmDialog
        open={!!removeTarget}
        title="Remove student"
        message={`Remove ${removeTarget?.full_name} from the school? They will no longer be able to log in.`}
        confirmText="Remove"
        onConfirm={doRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}