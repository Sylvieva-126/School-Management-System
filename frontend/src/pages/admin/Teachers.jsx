import React, { useState, useEffect, useCallback } from 'react';
import { FiCopy, FiCheck, FiRefreshCw, FiUserX } from 'react-icons/fi';
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

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');
  const [hireResult, setHireResult] = useState(null);

  // Hire form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/teachers');
      setTeachers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const hire = async (e) => {
    e.preventDefault();
    setActionMsg(''); setActionErr(''); setHireResult(null);
    setBusy(true);
    try {
      const data = await apiFetch('/teachers', {
        method: 'POST',
        body: JSON.stringify({ fullName, email: email || undefined, phone })
      });
      setHireResult(data);            // { message, activationLink }
      setFullName(''); setEmail(''); setPhone('');
      await load();
    } catch (err) {
      setActionErr(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deactivate = (t) => {
    if (!window.confirm(`Remove ${t.full_name}?\nTheir account is deactivated and login revoked.`)) return;
    setActionMsg(''); setActionErr('');
    apiFetch(`/teachers/${t.id}/deactivate`, { method: 'PATCH' })
      .then(() => { setActionMsg(`${t.full_name} removed`); return load(); })
      .catch(err => setActionErr(err.message));
  };

  const activeCount = teachers.filter(t => t.active).length;

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.15rem' }}>Teachers</h1>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>{activeCount} active of {teachers.length}</span>
        </div>
        <button className="btn-ghost" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}
      {actionMsg && <div className="success-text" style={{ marginBottom: '0.75rem' }}>{actionMsg}</div>}
      {actionErr && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{actionErr}</div>}

      {/* ===== HIRE ===== */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Hire a teacher</h2>
        {hireResult && (
          <div className="card" style={{ background: 'var(--surface-2)', boxShadow: 'none', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Account created — send them this link:</div>
            <CopyBox label="ACTIVATION LINK — the teacher opens it and sets their own password" value={hireResult.activationLink} />
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem', marginBottom: 0 }}>
              Expires in 24 hours. Shown once — copy it now. It is also delivered by email/SMS if the teacher has contact details on file.
            </p>
          </div>
        )}
        <form onSubmit={hire} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label>Full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="e.g. Mrs. Bisi" />
          </div>
          <div>
            <label>Email (optional)</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="teacher@school.com" />
          </div>
          <div>
            <label>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="080…" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Creating…' : 'Hire'}
            </button>
          </div>
        </form>
        <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.6rem', marginBottom: 0 }}>
          New teachers log in with their email or phone. Promote a teacher to admin on the Manage Admins page.
        </p>
      </div>

      {/* ===== LIST ===== */}
      <div className="card" style={{ minWidth: 0 }}>
        <div className="table-container">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th style={{ width: '1%' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && teachers.length === 0 && (
                <tr><td colSpan="5"><div className="skeleton" style={{ height: '2.2rem' }} /></td></tr>
              )}
              {!loading && teachers.length === 0 && (
                <tr><td colSpan="5" className="text-muted">No teachers yet</td></tr>
              )}
              {teachers.map(t => (
                <tr key={t.id} style={{ opacity: t.active ? 1 : 0.55 }}>
                  <td className="cell-truncate" title={t.full_name} style={{ fontWeight: 600 }}>{t.full_name}</td>
                  <td className="cell-truncate" title={t.email || ''}>{t.email || <span className="text-muted">—</span>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{t.phone}</td>
                  <td>
                    {t.active
                      ? <span className="badge badge-success">Active</span>
                      : <span className="badge badge-danger">Removed</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {t.active && (
                        <button className="btn-danger" title="Deactivate account"
                                onClick={() => deactivate(t)}
                                style={{ padding: '0.32rem 0.5rem', display: 'flex', alignItems: 'center' }}>
                          <FiUserX size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}