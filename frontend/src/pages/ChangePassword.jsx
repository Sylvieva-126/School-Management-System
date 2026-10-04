import React, { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { passwordIssue } from '../utils/validation';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword === oldPassword && oldPassword) {
      setError('New password must be different from the old password');
      return;
    }
    const issue = passwordIssue(newPassword);
    if (issue) return setError(issue);

    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await apiFetch('/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const updatedUser = { ...user, mustChangePassword: false };
      const token = localStorage.getItem('token');
      login(token, updatedUser);

      setSuccess(data.message || 'Password changed successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-page">
      <div className="card" style={{ width: '100%', maxWidth: '440px' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Change Password</h2>
        {user?.mustChangePassword && (
          <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>
            You must change your password before continuing.
          </p>
        )}
        {error && <div className="error-text" style={{ marginBottom: '1rem' }}>{error}</div>}
        {success && <div className="success-text" style={{ marginBottom: '1rem' }}>{success}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="oldPassword">Current Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="oldPassword"
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                required
                style={{ paddingRight: '2.75rem' }}
              />
              <button type="button" className="btn-ghost" onClick={() => setShowOld(!showOld)}
                      aria-label={showOld ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: '0.25rem', top: '50%', transform: 'translateY(-50%)', padding: '0.4rem', display: 'flex' }}>
                {showOld ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="newPassword">New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                style={{ paddingRight: '2.75rem' }}
              />
              <button type="button" className="btn-ghost" onClick={() => setShowNew(!showNew)}
                      aria-label={showNew ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: '0.25rem', top: '50%', transform: 'translateY(-50%)', padding: '0.4rem', display: 'flex' }}>
                {showNew ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Min 8 chars with uppercase, lowercase, number & special character.
            </p>
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}