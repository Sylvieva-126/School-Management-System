import React, { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiRefreshCw, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { apiFetch } from '../../api/client';
import { formatNaira } from '../../utils/format';

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

function ChildCard({ child }) {
  const [open, setOpen] = useState(false);
  const [fees, setFees] = useState([]);
  const [cards, setCards] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState('');

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      try {
        const [f, c] = await Promise.all([
          apiFetch(`/parent/children/${child.id}/fees`),
          apiFetch(`/parent/children/${child.id}/report-cards`),
        ]);
        setFees(f);
        setCards(c);
        setLoaded(true);
      } catch (e) {
        setErr(e.message);
      }
    }
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div onClick={toggle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{child.full_name}</div>
          <div className="text-muted" style={{ fontSize: '0.85rem' }}>
            {child.class_name || 'No class'} · {child.admission_no}
            {child.class_teacher_name && <> · Teacher: <strong>{child.class_teacher_name}</strong></>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="section-label" style={{ fontSize: '0.62rem' }}>Attendance</div>
            <div style={{ fontWeight: 700, color: child.attendance_percentage >= 75 ? 'var(--success)' : 'var(--danger)' }}>
              {child.attendance_percentage}%
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="section-label" style={{ fontSize: '0.62rem' }}>Fees owed</div>
            <div style={{ fontWeight: 700, color: Number(child.fee_balance) > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {formatNaira(child.fee_balance)}
            </div>
          </div>
          {open ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
        </div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '1rem' }}>
          {err && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{err}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.25rem' }}>
            <div>
              <h3 className="section-label" style={{ marginBottom: '0.5rem' }}>Fees</h3>
              {fees.length === 0 ? (
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>No fees billed yet.</div>
              ) : (
                fees.map(f => (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                    <span>{f.term_name}</span>
                    <span style={{ fontWeight: 600, color: Number(f.balance) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {formatNaira(f.balance)} left
                    </span>
                  </div>
                ))
              )}
            </div>
            <div>
              <h3 className="section-label" style={{ marginBottom: '0.5rem' }}>Report cards</h3>
              {cards.length === 0 ? (
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>None published yet.</div>
              ) : (
                cards.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.88rem' }}>{r.exam_name} · {r.term_name}</span>
                    <button className="btn-primary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={() => downloadReportCard(r.id, r.file_name).catch(e => setErr(e.message))}>
                      <FiDownload size={12} /> Download
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParentPortal() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/parent/children');
      setChildren(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.15rem' }}>My Children</h1>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>{children.length} enrolled</span>
        </div>
        <button className="btn-ghost" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}
      {loading && <div className="card">Loading…</div>}
      {!loading && children.length === 0 && (
        <div className="card text-muted">No children linked to your account. Contact the school office.</div>
      )}
      {children.map(c => <ChildCard key={c.id} child={c} />)}
    </div>
  );
}