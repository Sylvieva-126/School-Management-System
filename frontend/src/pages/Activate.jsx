import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

export default function Activate() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setStatus({ type: 'error', msg: 'Passwords do not match' });
      return;
    }
    if (password.length < 8) {
      setStatus({ type: 'error', msg: 'Password must be at least 8 characters' });
      return;
    }
    setStatus({ type: '', msg: '' });
    setLoading(true);
    try {
      // Correctly targets the backend /api/activate endpoint
      await apiFetch('/activate', {
        method: 'POST',
        body: JSON.stringify({ token, password })
      });
      setStatus({ type: 'success', msg: 'Account activated successfully. You can now log in.' });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Invalid activation link.</div>;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Activate Account</h2>
        {status.msg && (
          <div className={status.type === 'error' ? 'error-text' : 'success-text'} style={{ marginBottom: '1rem', textAlign: 'center' }}>
            {status.msg}
          </div>
        )}
        {status.type === 'success' ? (
          <Link to="/login" className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>Go to Login</Link>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="password">New Password</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="confirm">Confirm Password</label>
              <input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Activating...' : 'Activate Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}