import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotIsError, setForgotIsError] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      });

      login(data.token, {
        role: data.role,
        name: data.name,
        mustChangePassword: data.mustChangePassword
      });

      if (data.mustChangePassword) {
        navigate('/change-password');
      } else {
        const r = data.role;
        if (r === 'super_admin' || r === 'admin') navigate('/admin/dashboard');
        else if (r === 'teacher') navigate('/teacher');
        else if (r === 'parent') navigate('/parent');
        else if (r === 'student') navigate('/student');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setForgotMsg('');
    setLoading(true);
    try {
      const data = await apiFetch('/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier })
      });
      setForgotMsg(data.message || 'If the account exists, a reset link has been sent.');
      setForgotIsError(false);
    } catch (err) {
      setForgotMsg(err.message);
      setForgotIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Login</h2>
        {error && <div className="error-text" style={{ marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        {forgotMode ? (
          <>
            <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
              Enter your email, phone, or admission number. Students without a registered
              email/phone must ask the school office to reset their password.
            </p>
            {forgotMsg && (
              <div className={forgotIsError ? 'error-text' : 'success-text'}
                   style={{ marginBottom: '1rem', textAlign: 'center' }}>
                {forgotMsg}
              </div>
            )}
            <form onSubmit={handleForgot}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="fp-identifier">Email, Phone, or Admission No</label>
                <input
                  id="fp-identifier"
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <button type="button" className="btn-ghost" style={{ width: '100%', marginTop: '0.75rem' }}
                    onClick={() => { setForgotMode(false); setForgotMsg(''); setError(''); }}>
              Back to Login
            </button>
          </>
        ) : (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="identifier">Email, Phone, or Admission No</label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: '0.25rem', top: '50%',
                    transform: 'translateY(-50%)', padding: '0.4rem',
                    display: 'flex', alignItems: 'center'
                  }}
                >
                  {showPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>
            <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
              <button type="button" className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                      onClick={() => { setForgotMode(true); setError(''); setForgotMsg(''); }}>
                Forgot password?
              </button>
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}