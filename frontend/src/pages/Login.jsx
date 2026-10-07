// src/pages/Login.jsx — login + forgot-password modes (screenshot-matched).
// Wrong password = 401 from backend; client.js guarantees it shows INLINE
// here ("Invalid credentials") and never redirects.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../api/client';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setErr(''); setMsg('');
    setBusy(true);
    try {
      const u = await login(identifier.trim(), password);
      // mustChangePassword users go straight to the password form;
      // everyone else lands on "/" and HomeRedirect routes by role.
      navigate(u.mustChangePassword ? '/change-password' : '/', { replace: true });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setErr(''); setMsg('');
    setBusy(true);
    try {
      const d = await apiFetch('/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      setMsg(d.message || 'If that account has an email or phone on file, a reset link has been sent.');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-page">
      <div className="card" style={{ width: 400, maxWidth: '92vw' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.25rem' }}>School Login</h2>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <label htmlFor="identifier">Email, Phone, or Admission No</label>
            <input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />

            <label htmlFor="password" style={{ marginTop: '0.9rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: '2.6rem' }}
                required
              />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowPw((s) => !s)}
                title={showPw ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: '0.3rem 0.5rem' }}
              >
                {showPw ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
              <button type="button" className="btn-ghost" style={{ fontSize: '0.85rem', padding: '0.2rem 0.4rem' }} onClick={() => { setMode('forgot'); setErr(''); setMsg(''); }}>
                Forgot password?
              </button>
            </div>

            {err && <div className="error-text">{err}</div>}
            {msg && <div className="success-text">{msg}</div>}

            <button className="btn-primary" disabled={busy} style={{ width: '100%', marginTop: '1rem' }}>
              {busy ? 'Logging in…' : 'Log In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgot}>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              Enter your email, phone, or admission number. Students without a
              registered email/phone must ask the school office to reset their password.
            </p>

            <label htmlFor="fid">Email, Phone, or Admission No</label>
            <input
              id="fid"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            {err && <div className="error-text">{err}</div>}
            {msg && <div className="success-text">{msg}</div>}

            <button className="btn-primary" disabled={busy} style={{ width: '100%', marginTop: '1rem' }}>
              {busy ? 'Sending…' : 'Send Reset Link'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.9rem' }}>
              <button type="button" className="btn-ghost" onClick={() => { setMode('login'); setErr(''); setMsg(''); }}>
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}