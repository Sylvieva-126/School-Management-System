import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiFetch('/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword })
      });

      // Update local user state to clear mustChangePassword flag
      const updatedUser = { ...user, mustChangePassword: false };
      const token = localStorage.getItem('token');
      login(token, updatedUser);

      const r = updatedUser.role;
      if (r === 'super_admin' || r === 'admin') navigate('/admin/dashboard');
      else if (r === 'teacher') navigate('/teacher');
      else if (r === 'parent') navigate('/parent');
      else if (r === 'student') navigate('/student');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Change Password</h2>
        {user?.mustChangePassword && (
          <p className="text-muted" style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '0.875rem' }}>
            You must change your password before continuing.
          </p>
        )}
        {error && <div className="error-text" style={{ marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="oldPassword">Current Password</label>
            <input id="oldPassword" type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="newPassword">New Password</label>
            <input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}