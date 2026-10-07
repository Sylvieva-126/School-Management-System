// src/pages/Activate.jsx — "Set Your Password" landing for activation links.
// URL: /activate?token=... (one-time token from the admit/hire flow).
// Client-side complexity mirror of the backend PasswordPolicy (her spec).
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { apiFetch } from '../api/client';

const COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function Activate() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (password !== confirm) {
      setErr('Passwords do not match');
      return;
    }
    if (!COMPLEXITY.test(password)) {
      setErr('Min 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/activate', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-page">
      <div className="card" style={{ width: 400, maxWidth: '92vw' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>Set Your Password</h2>

        {!token ? (
          <p className="error-text">
            This activation link is missing its token. Ask the school office for a fresh link.
          </p>
        ) : done ? (
          <p className="success-text" style={{ textAlign: 'center' }}>
            Password set! Redirecting you to login…
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              Min 8 characters, with an uppercase letter, a lowercase letter,
              a number, and a special character.
            </p>

            <label htmlFor="np">New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="np"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                style={{ paddingRight: '2.6rem' }}
                required
              />
              <button type="button" className="btn-ghost" onClick={() => setShowPw((s) => !s)}
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: '0.3rem 0.5rem' }}>
                {showPw ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <label htmlFor="cp" style={{ marginTop: '0.9rem' }}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="cp"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                style={{ paddingRight: '2.6rem' }}
                required
              />
              <button type="button" className="btn-ghost" onClick={() => setShowConfirm((s) => !s)}
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: '0.3rem 0.5rem' }}>
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {err && <div className="error-text">{err}</div>}

            <button className="btn-primary" disabled={busy} style={{ width: '100%', marginTop: '1rem' }}>
              {busy ? 'Activating…' : 'Activate Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}