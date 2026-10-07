// src/components/ConfirmDialog.jsx — reusable yes/no modal.
// Usage: <ConfirmDialog open={bool} title="..." message="..."
//         onConfirm={...} onCancel={...} />
import { FaExclamationTriangle } from 'react-icons/fa';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  danger = true,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onCancel}
    >
      <div className="card" style={{ maxWidth: 420, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaExclamationTriangle color="#C0392B" />
          {title}
        </h3>
        <p className="text-muted" style={{ margin: '0.75rem 0 1.25rem' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}