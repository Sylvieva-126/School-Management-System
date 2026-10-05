import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiRefreshCw, FiBell } from 'react-icons/fi';
import { apiFetch } from '../../api/client';
import { formatNaira } from '../../utils/format';

export default function Fees() {
  // Data
  const [structures, setStructures] = useState([]);
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [students, setStudents] = useState([]);
  const [debtors, setDebtors] = useState({ items: [], total: 0 });

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');
  const [debtorQ, setDebtorQ] = useState('');

  // Form state — structures
  const [sClassId, setSClassId] = useState('');
  const [sTermId, setSTermId] = useState('');
  const [sAmount, setSAmount] = useState('');
  const [sBusy, setSBusy] = useState(false);

  // Form state — generate invoices
  const [gClassId, setGClassId] = useState('');
  const [gTermId, setGTermId] = useState('');   // '' = active term (backend default)
  const [gBusy, setGBusy] = useState(false);

  // Form state — record payment
  const [pStudentId, setPStudentId] = useState('');
  const [pTermId, setPTermId] = useState('');
  const [pAmount, setPAmount] = useState('');
  const [pBusy, setPBusy] = useState(false);

  // Form state — reminders
  const [rBusy, setRBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [structs, cls, tms, deb] = await Promise.all([
        apiFetch('/fees/structures'),
        apiFetch('/classes'),
        apiFetch('/terms'),
        apiFetch('/fees/debtors'),
      ]);
      setStructures(structs);
      setClasses(cls);
      setTerms(tms);
      setDebtors(deb);

      const active = tms.find(t => t.active);
      if (active) {
        setSTermId(prev => prev || String(active.id));
        setPTermId(prev => prev || String(active.id));
      }
      if (cls.length) {
        setSClassId(prev => prev || String(cls[0].id));
        setGClassId(prev => prev || String(cls[0].id));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Students load lazily for the payment dropdown (name + admission no)
  const loadStudents = async () => {
    if (students.length) return;
    try {
      const data = await apiFetch('/students?q=&page=1');
      setStudents(data.items);
    } catch (err) {
      setActionErr(err.message);
    }
  };

  const clearMsgs = () => { setActionMsg(''); setActionErr(''); };

  // ===== 1. Create fee structure =====
  const addStructure = async (e) => {
    e.preventDefault();
    clearMsgs(); setSBusy(true);
    try {
      await apiFetch('/fees/structures', {
        method: 'POST',
        body: JSON.stringify({ classId: Number(sClassId), termId: Number(sTermId), amount: Number(sAmount) })
      });
      setSAmount('');
      setActionMsg('Fee structure created');
      await load();
    } catch (err) {
      setActionErr(err.message);   // 409 "already exists" / 400 closed term land here
    } finally {
      setSBusy(false);
    }
  };

  // ===== 2. Generate invoices =====
  const generateInvoices = async () => {
    clearMsgs(); setGBusy(true);
    try {
      const body = { classId: Number(gClassId) };
      if (gTermId) body.termId = Number(gTermId);
      const data = await apiFetch('/fees/generate-invoices', { method: 'POST', body: JSON.stringify(body) });
      setActionMsg(data.message + (data.message.startsWith('0') ? ' — all students already billed for this term.' : ''));
      await load();
    } catch (err) {
      setActionErr(err.message);
    } finally {
      setGBusy(false);
    }
  };

  // ===== 3. Record payment =====
  const recordPayment = async (e) => {
    e.preventDefault();
    clearMsgs(); setPBusy(true);
    try {
      const data = await apiFetch('/fees/record-payment', {
        method: 'POST',
        body: JSON.stringify({ studentId: Number(pStudentId), termId: Number(pTermId), amount: Number(pAmount) })
      });
      setActionMsg(`Payment recorded — remaining balance: ${formatNaira(data.remainingBalance)}`);
      setPAmount('');
      await load();
    } catch (err) {
      setActionErr(err.message);   // exceeds balance / fully paid land here
    } finally {
      setPBusy(false);
    }
  };

  // ===== 4. Remind debtors =====
  const remindDebtors = async () => {
    clearMsgs(); setRBusy(true);
    try {
      const data = await apiFetch('/fees/remind-debtors', { method: 'POST' });
      setActionMsg(data.message);
    } catch (err) {
      setActionErr(err.message);
    } finally {
      setRBusy(false);
    }
  };

  // ===== Search debtors =====
  const searchDebtors = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch(`/fees/debtors?q=${encodeURIComponent(debtorQ)}`);
      setDebtors(data);
    } catch (err) {
      setActionErr(err.message);
    }
  };

  const termName = (id) => terms.find(t => t.id === id)?.name || `Term ${id}`;
  const className = (id) => classes.find(c => c.id === id)?.name || `Class ${id}`;

  if (loading) {
    return (
      <div>
        <h1 style={{ marginBottom: '1.25rem' }}>Fees</h1>
        <div className="card"><div className="skeleton" style={{ height: '3rem', marginBottom: '1rem' }} /></div>
        <div className="card"><div className="skeleton" style={{ height: '8rem' }} /></div>
      </div>
    );
  }

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.15rem' }}>Fees</h1>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
            {debtors.total} debtor{debtors.total === 1 ? '' : 's'} · payments work even when a term is closed
          </span>
        </div>
        <button className="btn-ghost" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}
      {actionMsg && <div className="success-text" style={{ marginBottom: '0.75rem' }}>{actionMsg}</div>}
      {actionErr && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{actionErr}</div>}

      {/* ===== ROW 1: structures (left) + invoicing (right) ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'start', marginBottom: '1.25rem' }}>
        <div className="card">
          <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Fee structures — one per class per term, immutable</h2>
          <form onSubmit={addStructure} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem' }}>
            <select value={sClassId} onChange={e => setSClassId(e.target.value)} required>
              <option value="" disabled>Class…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={sTermId} onChange={e => setSTermId(e.target.value)} required>
              <option value="" disabled>Term…</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name} ({t.session_name})</option>)}
            </select>
            <input type="number" min="1" step="0.01" placeholder="Amount" value={sAmount}
                   onChange={e => setSAmount(e.target.value)} required />
            <button type="submit" className="btn-primary" disabled={sBusy} style={{ whiteSpace: 'nowrap' }}>
              {sBusy ? '…' : 'Set'}
            </button>
          </form>
          <div className="table-container" style={{ marginTop: '1rem' }}>
            <table className="compact-table">
              <thead>
                <tr><th>Class</th><th>Term</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {structures.length === 0 && <tr><td colSpan="3" className="text-muted">None set yet</td></tr>}
                {structures.map(f => (
                  <tr key={f.id}>
                    <td>{f.class_name}</td>
                    <td>{f.term_name}</td>
                    <td style={{ fontWeight: 600 }}>{formatNaira(f.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Generate invoices — bills every student in a class</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select value={gClassId} onChange={e => setGClassId(e.target.value)} style={{ flex: 1, minWidth: '140px' }}>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={gTermId} onChange={e => setGTermId(e.target.value)} style={{ flex: 1, minWidth: '180px' }}>
              <option value="">Active term (default)</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name} ({t.session_name})</option>)}
            </select>
            <button className="btn-primary" onClick={generateInvoices} disabled={gBusy || !gClassId} style={{ whiteSpace: 'nowrap' }}>
              {gBusy ? 'Generating…' : 'Generate'}
            </button>
          </div>
          <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.75rem', marginBottom: 0 }}>
            Pick a specific term to bill a <strong>closed</strong> term (recovery billing). Re-running never duplicates —
            "0 generated" means every student already has an invoice. New admissions in an active term are invoiced automatically.
          </p>
        </div>
      </div>

      {/* ===== ROW 2: record payment (left) + reminders (right) ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: '1.25rem', alignItems: 'start', marginBottom: '1.25rem' }}>
        <div className="card">
          <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Record a payment</h2>
          <form onSubmit={recordPayment} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem' }}>
            <select value={pStudentId} onChange={e => setPStudentId(e.target.value)} required
                    onFocus={loadStudents}>
              <option value="" disabled>Student…</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.full_name} — {s.admission_no}</option>
              ))}
            </select>
            <select value={pTermId} onChange={e => setPTermId(e.target.value)} required>
              <option value="" disabled>Term…</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input type="number" min="1" step="0.01" placeholder="Amount" value={pAmount}
                   onChange={e => setPAmount(e.target.value)} required />
            <button type="submit" className="btn-primary" disabled={pBusy} style={{ whiteSpace: 'nowrap' }}>
              {pBusy ? '…' : 'Record'}
            </button>
          </form>
          <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.6rem', marginBottom: 0 }}>
            Overpayment is rejected — pay the exact outstanding amount. Parent is notified automatically.
          </p>
        </div>

        <div className="card">
          <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Reminders</h2>
          <button className="btn-primary" onClick={remindDebtors} disabled={rBusy}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FiBell size={14} /> {rBusy ? 'Sending…' : 'Send reminders to all debtors'}
          </button>
          <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.6rem', marginBottom: 0 }}>
            Notifies every parent with an outstanding balance, any term.
          </p>
        </div>
      </div>

      {/* ===== ROW 3: debtors ===== */}
      <div className="card" style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          <h2 className="section-label" style={{ margin: 0 }}>Debtors — all terms</h2>
          <form onSubmit={searchDebtors} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <FiSearch size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input placeholder="Search…" value={debtorQ} onChange={e => setDebtorQ(e.target.value)}
                     style={{ paddingLeft: '2.1rem', marginBottom: 0, width: '200px' }} />
            </div>
            <button type="submit" className="btn-ghost" style={{ border: '1px solid var(--border)' }}>Search</button>
          </form>
        </div>
        <div className="table-container">
          <table className="compact-table">
            <thead>
              <tr><th>Student</th><th>Admission No</th><th>Class</th><th>Term</th><th>Billed</th><th>Balance</th></tr>
            </thead>
            <tbody>
              {debtors.items.length === 0 && (
                <tr><td colSpan="6" className="text-muted">No debtors — everyone is paid up 🎉</td></tr>
              )}
              {debtors.items.map(d => (
                <tr key={d.invoice_id}>
                  <td className="cell-truncate" title={d.full_name} style={{ fontWeight: 600 }}>{d.full_name}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{d.admission_no}</td>
                  <td>{d.class_name || <span className="text-muted">—</span>}</td>
                  <td>{d.term_name}</td>
                  <td>{formatNaira(d.amount)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{formatNaira(d.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}