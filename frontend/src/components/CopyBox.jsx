// src/components/CopyBox.jsx — readonly input + one-click Copy button.
// Used for admission numbers and activation/reset links. Gotcha #9:
// links must be copied via copy buttons, never retyped from screens.
import { useState } from 'react';

export default function CopyBox({ label, value }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // fallback for older browsers / non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label>{label}</label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          readOnly
          value={value}
          onFocus={(e) => e.target.select()}
          style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
        />
        <button className="btn-primary" onClick={copy} style={{ flexShrink: 0 }}>
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
    </div>
  );
}