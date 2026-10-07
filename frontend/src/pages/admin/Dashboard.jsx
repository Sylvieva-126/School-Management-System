import React, { useState, useEffect, useCallback } from 'react';
import { FiUsers, FiUserCheck, FiGrid, FiTrendingUp, FiAlertCircle,
         FiRefreshCw, FiUserX, FiCheckCircle, FiFileText, FiPlus } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { formatNaira } from '../../utils/format';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      setStats(await apiFetch('/dashboard'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="card">Loading dashboard...</div>;

  const Stat = ({ icon, label, value, tone }) => (
    <div style={{ flex: '1 1 0', minWidth: '150px', padding: '0.9rem 1.25rem', borderLeft: '1px solid var(--border)' }}>
      <div className="text-muted" style={{
        fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.3rem'
      }}>
        {icon}{label}
      </div>
      <div style={{
        fontSize: '1.5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        color: tone || 'var(--text)', lineHeight: 1.1
      }}>
        {value}
      </div>
    </div>
  );

  const QuickLink = ({ to, icon, label }) => (
    <Link to={to} className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', padding: '0.6rem 0.9rem', textDecoration: 'none' }}>
      {icon}{label}
    </Link>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.15rem' }}>Dashboard</h1>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>School overview</span>
        </div>
        <button className="btn-ghost" onClick={load} title="Refresh" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="card error-text" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* ===== STAT STRIP ===== */}
      <div className="card" style={{ padding: 0, marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
        <Stat icon={<FiUsers size={13} />} label="Students" value={stats?.students ?? '—'} />
        <Stat icon={<FiUserCheck size={13} />} label="Teachers" value={stats?.teachers ?? '—'} />
        <Stat icon={<FiGrid size={13} />} label="Classes" value={stats?.classes ?? '—'} />
        <Stat icon={<FiTrendingUp size={13} />} label="Collected · this term" value={formatNaira(stats?.activeTermPayments)} tone="var(--success)" />
        <Stat icon={<FiAlertCircle size={13} />} label="Outstanding · this term" value={formatNaira(stats?.activeTermBalances)} tone="var(--danger)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: '1.25rem', alignItems: 'start' }}>
        {/* ===== TODAY AT A GLANCE (live, non-redundant) ===== */}
        <div className="card" style={{ minWidth: 0 }}>
          <h2 className="section-label" style={{ marginBottom: '0.9rem' }}>Today at a glance</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FiUserX size={20} color="var(--danger)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{stats?.studentsAbsentToday ?? 0}</div>
                <div className="text-muted" style={{ fontSize: '0.78rem' }}>students absent today</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FiCheckCircle size={20} color="var(--success)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{stats?.teachersPresentToday ?? 0}</div>
                <div className="text-muted" style={{ fontSize: '0.78rem' }}>teachers present today</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FiFileText size={20} color="var(--warning)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{stats?.pendingReportCards ?? 0}</div>
                <div className="text-muted" style={{ fontSize: '0.78rem' }}>report cards awaiting review</div>
              </div>
            </div>
          </div>
          <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '1rem', marginBottom: 0 }}>
            Live counters — mark an attendance or publish a card and watch them move.
          </p>
        </div>

        {/* ===== QUICK ACTIONS ===== */}
        <div className="card" style={{ minWidth: 0 }}>
          <h2 className="section-label" style={{ marginBottom: '0.9rem' }}>Quick actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <QuickLink to="/admin/students" icon={<FiPlus size={14} />} label="Admit a student" />
            <QuickLink to="/admin/fees" icon={<FiTrendingUp size={14} />} label="Record a payment" />
            <QuickLink to="/admin/report-cards" icon={<FiFileText size={14} />} label="Review report cards" />
            <QuickLink to="/admin/exams" icon={<FiPlus size={14} />} label="Create an exam" />
          </div>
        </div>
      </div>
    </div>
  );
}