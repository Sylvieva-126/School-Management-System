// src/pages/admin/Fees.jsx — Tier 1, build item 5. Four sections, ONE page:
//   1. Structures — one per class+term, immutable (409 dup, 400 closed term)
//   2. Generate invoices — "0 generated" = SUCCESS, already billed (gotcha #5)
//   3. Record payment — overpay/already-paid 400s shown; shows remainingBalance
//   4. Debtors (ALL terms) + search + Send reminders
import { useEffect, useState, useCallback } from 'react';
import { FaSyncAlt, FaSearch, FaBullhorn } from 'react-icons/fa';
import { apiFetch } from '../../api/client';
import { formatNaira } from '../../utils/format';

const smallBtn = { padding: '0.35rem 0.8rem', fontSize: '0.85rem' };

export default function Fees() {
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [structures, setStructures] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [debtorCount, setDebtorCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  // structure form
  const [sClassId, setSClassId] = useState('');
  const [sTermId, setSTermId] = useState('');
  const [sAmount, setSAmount] = useState('');

  // generate-invoices form
  const [gClassId, setGClassId] = useState('');
  const [gTermId, setGTermId] = useState(''); // '' = active term (default)

  // record-payment form
  const [pStudentId, setPStudentId] = useState('');
  const [pTermId, setPTermId] = useState('');
  const [pAmount, setPAmount] = useState('');
  const [students, setStudents] = useState([]);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentsLoaded, setStudentsLoaded] = useState(false);

  // debtors search
  const [dqInput, setDqInput] = useState('');
  const [dq, setDq] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [c, t, st, d] = await Promise.all([
        apiFetch('/classes'),
        apiFetch('/terms'),
        apiFetch('/fees/structures'),
        apiFetch(`/fees/debtors?q=${encodeURIComponent(dq)}`),
      ]);
      setClasses(Array.isArray(c) ? c : []);
      setTerms(Array.isArray(t) ? t : []);
      setStructures(Array.isArray(st) ? st : []);
      setDebtors(d.items || []);
      setDebtorCount((d.items || []).length);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [dq]);

  useEffect(() => { load(); }, [load]);

  // Lazy-load students for the payment dropdown — on first focus (her spec)
  async function loadStudents(q = '') {
    try {
      const d = await apiFetch(`/students?q=${encodeURIComponent(q)}&page=1`);
      setStudents(d.items || []);
      setStudentsLoaded(true);
    } catch { /* dropdown just stays empty */ }
  }

  async function setStructure(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try {
      await apiFetch('/fees/structures', {
        method: 'POST',
        body: JSON.stringify({ classId: Number(sClassId), termId: Number(sTermId), amount: Number(sAmount) }),
      });
      setMsg('Fee structure set.');
      setSAmount('');
      load();
    } catch (e2) {
      setErr(e2.message); // 409 duplicate · 400 closed term
    }
  }

  async function generateInvoices(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try {
      const body = { classId: Number(gClassId) };
      if (gTermId) body.termId = Number(gTermId);
      const d = await apiFetch('/fees/generate-invoices', { method: 'POST', body: JSON.stringify(body) });
      // d.message like "N invoices generated" — 0 means already billed (SUCCESS)
      setMsg(d.message || 'Invoices generated.');
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function recordPayment(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try {
      const d = await apiFetch('/fees/record-payment', {
        method: 'POST',
        body: JSON.stringify({ studentId: Number(pStudentId), termId: Number(pTermId), amount: Number(pAmount) }),
      });
      const rem = d.remainingBalance;
      setMsg(
        rem === 0
          ? 'Payment recorded — fully paid! 🎉'
          : `Payment recorded. Remaining balance: ${formatNaira(rem)}`
      );
      setPStudentId(''); setPAmount('');
      load();
    } catch (e2) {
      setErr(e2.message); // 400 exceeds balance / already paid
    }
  }

  async function remindDebtors() {
    setErr(''); setMsg('');
    try {
      const d = await apiFetch('/fees/remind-debtors', { method: 'POST' });
      setMsg(d.message || 'Reminders sent to all debtors.');
    } catch (e2) {
      setErr(e2.message);
    }
  }

  function searchDebtors(e) {
    e.preventDefault();
    setDq(dqInput.trim());
  }

  const termLabel = (t) => `${t.name}${t.session_name ? ` (${t.session_name})` : ''}${t.closed ? ' — closed' : ''}`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Fees</h1>
          <div className="text-muted">{debtorCount} debtors · payments work even when a term is closed</div>
        </div>
        <button className="btn-ghost" onClick={load}><FaSyncAlt /> Refresh</button>
      </div>

      {err && <div className="error-text">{err}</div>}
      {msg && <div className="success-text">{msg}</div>}

      {/* Row 1: Structures + Generate invoices */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div className="card" style={{ flex: 1.2, minWidth: 320 }}>
          <div className="section-label">Fee structures — one per class per term, immutable</div>
          <form onSubmit={setStructure} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
            <select value={sClassId} onChange={(e) => setSClassId(e.target.value)} style={{ flex: '1 1 110px' }} required>
              <option value="">Class…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={sTermId} onChange={(e) => setSTermId(e.target.value)} style={{ flex: '1 1 150px' }} required>
              <option value="">Term…</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{termLabel(t)}</option>)}
            </select>
            <input type="number" min="1" placeholder="Amount" value={sAmount} onChange={(e) => setSAmount(e.target.value)} style={{ flex: '1 1 100px' }} required />
            <button className="btn-primary" style={smallBtn} disabled={loading}>Set</button>
          </form>
          <div className="table-container" style={{ marginTop: '0.9rem' }}>
            <table className="compact-table">
              <thead>
                <tr><th>Class</th><th>Term</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {structures.length === 0 ? (
                  <tr><td colSpan={3} className="text-muted">No fee structures yet.</td></tr>
                ) : (
                  structures.map((s) => (
                    <tr key={s.id}>
                      <td>{s.class_name || s.class_id}</td>
                      <td>{s.term_name || s.term_id}</td>
                      <td><strong>{formatNaira(s.amount)}</strong></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 300 }}>
          <div className="section-label">Generate invoices — bills every student in a class</div>
          <form onSubmit={generateInvoices} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
            <select value={gClassId} onChange={(e) => setGClassId(e.target.value)} style={{ flex: '1 1 120px' }} required>
              <option value="">Class…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={gTermId} onChange={(e) => setGTermId(e.target.value)} style={{ flex: '1 1 160px' }}>
              <option value="">Active term (default)</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{termLabel(t)}</option>)}
            </select>
            <button className="btn-primary" style={smallBtn} disabled={loading}>Generate</button>
          </form>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.6rem' }}>
            Pick a specific term to bill a <strong>closed</strong> term (recovery billing).
            Re-running never duplicates — “0 invoices generated” means every student already has an invoice.
          </p>
        </div>
      </div>

      {/* Row 2: Record payment + Reminders */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div className="card" style={{ flex: 1.4, minWidth: 340 }}>
          <div className="section-label">Record a payment</div>
          <form onSubmit={recordPayment} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem', alignItems: 'center' }}>
            <select
              value={pStudentId}
              onChange={(e) => setPStudentId(e.target.value)}
              onFocus={() => { if (!studentsLoaded) loadStudents(); }}
              style={{ flex: '1 1 200px' }}
              required
            >
              <option value="">Student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name} — {s.admission_no}</option>
              ))}
            </select>
            <select value={pTermId} onChange={(e) => setPTermId(e.target.value)} style={{ flex: '1 1 140px' }} required>
              <option value="">Term…</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{termLabel(t)}</option>)}
            </select>
            <input type="number" min="1" placeholder="Amount" value={pAmount} onChange={(e) => setPAmount(e.target.value)} style={{ flex: '1 1 100px' }} required />
            <button className="btn-primary" style={smallBtn}>Record</button>
          </form>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', alignItems: 'center' }}>
            <input
              placeholder="Not in the list? Search students…"
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); loadStudents(studentQuery.trim()); } }}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn-ghost" style={smallBtn} onClick={() => loadStudents(studentQuery.trim())}>
              Search
            </button>
          </div>
          <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>
            Overpayment is rejected — pay the exact outstanding amount. Parent is notified automatically.
          </div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <div className="section-label">Reminders</div>
          <button className="btn-primary" style={{ marginTop: '0.6rem' }} onClick={remindDebtors}>
            <FaBullhorn /> Send reminders to all debtors
          </button>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.6rem' }}>
            Notifies every parent with an outstanding balance, any term.
          </p>
        </div>
      </div>

      {/* Debtors table — ALL terms */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="section-label">Debtors — all terms</div>
          <form onSubmit={searchDebtors} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input placeholder="Search…" value={dqInput} onChange={(e) => setDqInput(e.target.value)} style={{ paddingLeft: '2.2rem', width: 220 }} />
            </div>
            <button className="btn-primary" style={smallBtn}>Search</button>
          </form>
        </div>

        <div className="table-container" style={{ marginTop: '0.9rem' }}>
          <table className="compact-table">
            <thead>
              <tr>
                <th>Student</th><th>Admission No</th><th>Class</th><th>Term</th><th>Billed</th><th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={6}><div className="skeleton" style={{ height: '1rem' }} /></td></tr>
                ))
              ) : debtors.length === 0 ? (
                <tr><td colSpan={6} className="text-muted">{dq ? `No debtors match “${dq}”.` : 'No debtors — every invoice is settled. 🎉'}</td></tr>
              ) : (
                debtors.map((d) => (
                  <tr key={d.invoice_id}>
                    <td><strong>{d.full_name}</strong></td>
                    <td>{d.admission_no}</td>
                    <td>{d.class_name}</td>
                    <td>{d.term_name}</td>
                    <td>{formatNaira(d.amount)}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: 700 }}>{formatNaira(d.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}