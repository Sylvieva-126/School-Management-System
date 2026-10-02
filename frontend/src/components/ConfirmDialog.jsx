import React from 'react';

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmText = "Yes", cancelText = "Cancel", isDanger = false }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', margin: '1rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>{title}</h3>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn-ghost" onClick={onCancel}>{cancelText}</button>
          <button className={isDanger ? "btn-danger" : "btn-primary"} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}