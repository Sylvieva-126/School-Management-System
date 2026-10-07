// src/pages/ChangePassword.jsx — centered card inside Layout (all roles).
// POST /change-password {oldPassword, newPassword}. Blocks new==old,
// mirrors the backend complexity rule, eye toggles. After success:
// logout (sessionKey bumps -> full reset) and back to /login.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function ChangePassword() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (newPw === oldPw) {
      setErr('New password must be different from the current one.');
      return;
    }
    if (!COMPLEXITY.test(newPw)) {
      setErr('Min 8 chars with uppercase, lowercase, number & special character.');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
      });
      setDone(true);
      setTimeout(() => {
        logout(); // full reset -> everyone lands on /login
        navigate('/login', { replace: true });
      }, 1500);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-page">
      <div className="card" style={{ width: 420, maxWidth: '92vw' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.1rem' }}>Change Password</h2>

        {done ? (
          <p className="success-text" style={{ textAlign: 'center' }}>
            Password updated. Redirecting you to login…
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="cp-old">Current Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="cp-old"
                type={showOld ? 'text' : 'password'}
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: '2.6rem' }}
                required
              />
              <button type="button" className="btn-ghost" onClick={() => setShowOld((s) => !s)}
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: '0.3rem 0.5rem' }}>
                {showOld ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <label htmlFor="cp-new" style={{ marginTop: '0.9rem' }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="cp-new"
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                style={{ paddingRight: '2.6rem' }}
                required
              />
              <button type="button" className="btn-ghost" onClick={() => setShowNew((s) => !s)}
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: '0.3rem 0.5rem' }}>
                {showNew ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.3rem' }}>
              Min 8 chars with uppercase, lowercase, number &amp; special character.
            </div>

            {err && <div className="error-text">{err}</div>}

            <button className="btn-primary" disabled={busy} style={{ width: '100%', marginTop: '1rem' }}>
              {busy ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}