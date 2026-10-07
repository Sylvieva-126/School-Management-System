// src/pages/admin/Teachers.jsx — Tier 1, build item 4.
// Hire -> 201 {message, activationLink} shown in a CopyBox (their ONLY
// password setup method). Deactivate = destructive -> ConfirmDialog.
// Removed teachers stay in the table, greyed with a Removed badge.
import { useEffect, useState, useCallback } from 'react';
import { FaSyncAlt, FaUserTimes } from 'react-icons/fa';
import { apiFetch } from '../../api/client';
import CopyBox from '../../components/CopyBox';
import ConfirmDialog from '../../components/ConfirmDialog';

const iconBtn = { padding: '0.35rem 0.5rem', fontSize: '0.85rem' };

export default function Teachers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  // hire form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hiring, setHiring] = useState(false);
  const [hireLink, setHireLink] = useState(null); // the activationLink after 201

  const [target, setTarget] = useState(null); // teacher being deactivated

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const d = await apiFetch('/teachers');
      setItems(Array.isArray(d) ? d : []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeCount = items.filter((t) => t.active).length;

  async function hire(e) {
    e.preventDefault();
    setErr(''); setMsg(''); setHireLink(null);
    setHiring(true);
    try {
      const d = await apiFetch('/teachers', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim(),
        }),
      });
      setHireLink(d.activationLink);
      setFullName(''); setEmail(''); setPhone('');
      load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setHiring(false);
    }
  }

  async function doDeactivate() {
    const t = target;
    setTarget(null);
    setErr(''); setMsg('');
    try {
      await apiFetch(`/teachers/${t.id}/deactivate`, { method: 'PATCH' });
      setMsg(`${t.full_name} deactivated — they can no longer log in.`);
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Teachers</h1>
          <div className="text-muted">{loading ? '…' : `${activeCount} active of ${items.length}`}</div>
        </div>
        <button className="btn-ghost" onClick={load}><FaSyncAlt /> Refresh</button>
      </div>

      {err && <div className="error-text">{err}</div>}
      {msg && <div className="success-text">{msg}</div>}

      {/* Hire result — copyable activation link, shown once */}
      {hireLink && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>Teacher hired — send them this link</h3>
          <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0 0.9rem' }}>
            Expires in <strong>24 hours</strong> and is shown <strong>only once</strong>.
            The teacher uses it to set their own password.
          </p>
          <CopyBox label="Activation link" value={hireLink} />
        </div>
      )}

      {/* Hire form */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="section-label">Hire a teacher</div>
        <form onSubmit={hire} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '0.6rem' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label>Full name</label>
            <input placeholder="e.g. Mrs. Bisi" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <label>Email (optional)</label>
            <input type="email" placeholder="teacher@school.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label>Phone</label>
            <input placeholder="080…" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <button className="btn-primary" disabled={hiring} style={{ padding: '0.5rem 2rem' }}>
            {hiring ? 'Hiring…' : 'Hire'}
          </button>
        </form>
        <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}>
          New teachers log in with their email or phone. Promote a teacher to admin on the Manage Admins page.
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="table-container">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={5}><div className="skeleton" style={{ height: '1rem' }} /></td></tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="text-muted">No teachers yet — hire the first one above.</td></tr>
              ) : (
                items.map((t) => (
                  <tr key={t.id} style={t.active ? undefined : { opacity: 0.55 }}>
                    <td><strong>{t.full_name}</strong></td>
                    <td className="cell-truncate">{t.email || '—'}</td>
                    <td>{t.phone || '—'}</td>
                    <td>
                      {t.active
                        ? <span className="badge badge-success">Active</span>
                        : <span className="badge badge-danger">Removed</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {t.active && (
                        <button
                          className="btn-ghost"
                          style={{ ...iconBtn, color: 'var(--danger)' }}
                          title="Deactivate teacher"
                          onClick={() => setTarget(t)}
                        >
                          <FaUserTimes />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!target}
        title="Deactivate teacher"
        message={`Deactivate ${target?.full_name}? They will no longer be able to log in.`}
        confirmText="Deactivate"
        onConfirm={doDeactivate}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}