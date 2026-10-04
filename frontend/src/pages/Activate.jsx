import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { apiFetch } from '../api/client';
import { passwordIssue } from '../utils/validation';

export default function Activate() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const issue = passwordIssue(password);
    if (issue) return setError(issue);
    if (password !== confirm) return setError('Passwords do not match');

    setLoading(true);
    try {
      const data = await apiFetch('/activate', {
        method: 'POST',
        body: JSON.stringify({ token, password })
      });
      setSuccess(data.message || 'Account activated successfully. You can now log in.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="card" style={{ maxWidth: '400px', textAlign: 'center' }}>
          No activation token in this link. Ask the school office for a new link.
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Set Your Password</h2>
        {error && <div className="error-text" style={{ marginBottom: '1rem' }}>{error}</div>}
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div className="success-text" style={{ marginBottom: '1rem' }}>{success}</div>
            <Link to="/login" className="btn-primary" style={{ display: 'inline-block', padding: '0.5rem 1.5rem' }}>
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
              Min 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="password">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '2.75rem' }}
                />
                <button type="button" className="btn-ghost" onClick={() => setShowPw(!showPw)}
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                        style={{ position: 'absolute', right: '0.25rem', top: '50%', transform: 'translateY(-50%)', padding: '0.4rem', display: 'flex' }}>
                  {showPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="confirm">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  style={{ paddingRight: '2.75rem' }}
                />
                <button type="button" className="btn-ghost" onClick={() => setShowConfirm(!showConfirm)}
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                        style={{ position: 'absolute', right: '0.25rem', top: '50%', transform: 'translateY(-50%)', padding: '0.4rem', display: 'flex' }}>
                  {showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
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