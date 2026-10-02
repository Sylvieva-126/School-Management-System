import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      });

      // Build user object from the flat backend response
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>School Login</h2>
        {error && <div className="error-text" style={{ marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
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
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}