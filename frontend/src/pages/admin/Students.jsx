import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiCopy, FiCheck, FiRefreshCw, FiKey, FiMove, FiAward, FiUserX } from 'react-icons/fi';
import { apiFetch } from '../../api/client';

function CopyBox({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div className="section-label" style={{ marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
        <input readOnly value={value}
               style={{ flex: 1, minWidth: 0, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 0 }} />
        <button type="button" className="btn-ghost" onClick={copy}
                style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
          {copied ? <FiCheck size={14} color="var(--success)" /> : <FiCopy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function AdmitResult({ result }) {
  return (
    <div className="card" style={{ background: 'var(--surface-2)', boxShadow: 'none', marginBottom: '1rem' }}>
      <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
        Admitted: {result.admissionNo && <span className="badge badge-primary" style={{ marginLeft: '0.4rem' }}>{result.admissionNo}</span>}
      </div>
      <CopyBox label="STUDENT ACTIVATION LINK — give to the student to set their password" value={result.studentActivationLink} />
      {result.parentActivationLink
        ? <CopyBox label="PARENT ACTIVATION LINK — give to the parent" value={result.parentActivationLink} />
        : <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Parent already had an account — no new link needed.</p>}
      <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem', marginBottom: 0 }}>
        Links expire in 24 hours. Copy them now — they are shown once.
      </p>
    </div>
  );
}

function MovePanel({ student, classes, onDone, onCancel }) {
  const [classId, setClassId] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!classId) return setErr('Pick a class');
    setErr(''); setBusy(true);
    try {
      await apiFetch(`/students/${student.id}/class`, { method: 'PATCH', body: JSON.stringify({ classId: Number(classId) }) });
      onDone(`${student.full_name} moved`);
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <tr>
      <td colSpan="5" style={{ background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>Move {student.full_name} to:</strong>
          <select value={classId} onChange={e => setClassId(e.target.value)} style={{ width: 'auto', minWidth: '150px', marginBottom: 0 }}>
            <option value="" disabled>Select class…</option>
            {classes.filter(c => c.name !== student.class_name).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={submit} disabled={busy} style={{ padding: '0.35rem 0.9rem', fontSize: '0.82rem' }}>
            {busy ? 'Moving…' : 'Move'}
          </button>
          <button className="btn-ghost" onClick={onCancel} style={{ padding: '0.35rem 0.9rem', fontSize: '0.82rem' }}>Cancel</button>
          {err && <span className="error-text" style={{ margin: 0 }}>{err}</span>}
        </div>
      </td>
    </tr>
  );
}

export default function Students() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [classes, setClasses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');

  const [admitResult, setAdmitResult] = useState(null);
  const [movingStudent, setMovingStudent] = useState(null);

  const [fullName, setFullName] = useState('');
  const [classId, setClassId] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [admitting, setAdmitting] = useState(false);

  const load = useCallback(async (searchQ = q, pageNum = page) => {
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch(`/students?q=${encodeURIComponent(searchQ)}&page=${pageNum}`);
      setItems(data.items);
      setTotal(data.total);
      setPages(data.pages);
      setPage(data.page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => { load('', 1); }, []);

  const loadClasses = async () => {
    try {
      const data = await apiFetch('/classes');
      setClasses(data);
      if (data.length) setClassId(prev => prev || String(data[0].id));
    } catch (err) {
      // surfaces on admit attempt
    }
  };
  useEffect(() => { loadClasses(); }, []);

  const search = (e) => {
    e.preventDefault();
    load(q, 1);
  };

  const admit = async (e) => {
    e.preventDefault();
    setActionMsg(''); setActionErr(''); setAdmitResult(null);
    setAdmitting(true);
    try {
      const data = await apiFetch('/students', {
        method: 'POST',
        body: JSON.stringify({ fullName, classId: Number(classId), parentName, parentPhone })
      });
      setAdmitResult(data);
      setFullName(''); setParentName(''); setParentPhone('');
      await load('', 1);
    } catch (err) {
      setActionErr(err.message);
    } finally {
      setAdmitting(false);
    }
  };

  const graduate = (s) => {
    if (!window.confirm(`Graduate ${s.full_name}?\nTheir login will be permanently locked out.`)) return;
    setActionMsg(''); setActionErr('');
    apiFetch(`/students/${s.id}/graduate`, { method: 'PATCH' })
      .then(() => { setActionMsg(`${s.full_name} graduated`); return load(); })
      .catch(err => setActionErr(err.message));
  };

  const remove = (s) => {
    if (!window.confirm(`Remove ${s.full_name}?\nTheir account is deactivated and login revoked.`)) return;
    setActionMsg(''); setActionErr('');
    apiFetch(`/students/${s.id}/deactivate`, { method: 'PATCH' })
      .then(() => { setActionMsg(`${s.full_name} removed`); return load(); })
      .catch(err => setActionErr(err.message));
  };

  const resetPassword = async (s) => {
    setActionMsg(''); setActionErr(''); setAdmitResult(null);
    try {
      const data = await apiFetch(`/students/${s.id}/reset-password`, { method: 'POST' });
      setAdmitResult({
        admissionNo: s.admission_no,
        studentActivationLink: data.resetLink,
        parentActivationLink: null
      });
    } catch (err) {
      setActionErr(err.message);
    }
  };

  const RowAction = ({ title, onClick, icon, danger, disabled }) => (
    <button
      className={danger ? 'btn-danger' : 'btn-ghost'}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '0.32rem 0.42rem', fontSize: '0.8rem',
        display: 'flex', alignItems: 'center',
        border: danger ? 'none' : '1px solid var(--border)'
      }}
    >
      {icon}
    </button>
  );

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.15rem' }}>Students</h1>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>{total} enrolled</span>
        </div>
        <button className="btn-ghost" onClick={() => load()} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}
      {actionMsg && <div className="success-text" style={{ marginBottom: '0.75rem' }}>{actionMsg}</div>}
      {actionErr && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{actionErr}</div>}

      {/* ===== ADMIT ===== */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Admit a student</h2>
        {admitResult && <AdmitResult result={admitResult} />}
        <form onSubmit={admit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label>Full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="e.g. Tunde Ade" />
          </div>
          <div>
            <label>Class</label>
            <select value={classId} onChange={e => setClassId(e.target.value)} required>
              <option value="" disabled>Select…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label>Parent name</label>
            <input value={parentName} onChange={e => setParentName(e.target.value)} required placeholder="e.g. Mr. Ade" />
          </div>
          <div>
            <label>Parent phone</label>
            <input value={parentPhone} onChange={e => setParentPhone(e.target.value)} required placeholder="080…" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={admitting} style={{ width: '100%' }}>
              {admitting ? 'Admitting…' : 'Admit'}
            </button>
          </div>
        </form>
        <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.6rem', marginBottom: 0 }}>
          Admission number is generated automatically. Same parent phone reuses the parent account — siblings share one login.
        </p>
      </div>

      {/* ===== LIST ===== */}
      <div className="card" style={{ minWidth: 0 }}>
        <form onSubmit={search} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FiSearch size={15} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input placeholder="Search name or admission number…" value={q}
                   onChange={e => setQ(e.target.value)} style={{ paddingLeft: '2.2rem', marginBottom: 0 }} />
          </div>
          <button type="submit" className="btn-primary">Search</button>
        </form>

        <div className="table-container">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Admission No</th><th>Name</th><th>Class</th><th>Status</th><th style={{ width: '1%' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && (
                <tr><td colSpan="5"><div className="skeleton" style={{ height: '2.2rem' }} /></td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan="5" className="text-muted">No students found</td></tr>
              )}
              {items.map(s => (
                <React.Fragment key={s.id}>
                  <tr style={{ opacity: s.graduated ? 0.55 : 1 }}>
                    <td style={{ whiteSpace: 'nowrap' }}>{s.admission_no}</td>
                    <td className="cell-truncate" title={s.full_name} style={{ fontWeight: 600 }}>{s.full_name}</td>
                    <td>{s.class_name || <span className="text-muted">—</span>}</td>
                    <td>
                      {s.graduated
                        ? <span className="badge badge-primary">Graduated</span>
                        : <span className="badge badge-success">Enrolled</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <RowAction title="Move to another class (promotion)" icon={<FiMove size={13} />}
                                   disabled={s.graduated}
                                   onClick={() => setMovingStudent(movingStudent?.id === s.id ? null : s)} />
                        <RowAction title="Generate a password reset link" icon={<FiKey size={13} />}
                                   disabled={s.graduated}
                                   onClick={() => resetPassword(s)} />
                        <RowAction title="Graduate (SS3 only — locks login)" icon={<FiAward size={13} />}
                                   disabled={s.graduated}
                                   onClick={() => graduate(s)} />
                        <RowAction title="Deactivate account" icon={<FiUserX size={13} />} danger
                                   disabled={s.graduated}
                                   onClick={() => remove(s)} />
                      </div>
                    </td>
                  </tr>
                  {movingStudent?.id === s.id && (
                    <MovePanel student={s} classes={classes}
                               onDone={(msg) => { setMovingStudent(null); setActionMsg(msg); load(); }}
                               onCancel={() => setMovingStudent(null)} />
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center', marginTop: '0.75rem' }}>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Page {page} of {pages}</span>
            <button className="btn-ghost" style={{ border: '1px solid var(--border)', padding: '0.25rem 0.7rem', fontSize: '0.8rem' }}
                    disabled={page <= 1} onClick={() => load(q, page - 1)}>Prev</button>
            <button className="btn-ghost" style={{ border: '1px solid var(--border)', padding: '0.25rem 0.7rem', fontSize: '0.8rem' }}
                    disabled={page >= pages} onClick={() => load(q, page + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}