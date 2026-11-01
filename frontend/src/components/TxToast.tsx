import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HashChip } from './HashChip';

export const TxToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 1000,
        maxWidth: '420px',
        width: '100%',
      }}
    >
      {toasts.map(toast => {
        let Icon = CheckCircle2;
        let iconColor = 'var(--ok)';
        let borderLeftColor = 'var(--ok)';

        if (toast.type === 'pending') {
          Icon = Loader2;
          iconColor = 'var(--info)';
          borderLeftColor = 'var(--info)';
        } else if (toast.type === 'danger') {
          Icon = XCircle;
          iconColor = 'var(--danger)';
          borderLeftColor = 'var(--danger)';
        } else if (toast.type === 'info') {
          Icon = AlertTriangle;
          iconColor = 'var(--warn)';
          borderLeftColor = 'var(--warn)';
        }

        return (
          <div
            key={toast.id}
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: `4px solid ${borderLeftColor}`,
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-popover)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              animation: 'fadeIn 150ms ease-out',
            }}
          >
            <div style={{ flexShrink: 0, marginTop: '2px' }}>
              <Icon
                size={18}
                strokeWidth={2}
                color={iconColor}
                className={toast.type === 'pending' ? 'animate-spin' : ''}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                {toast.title}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '2px', lineHeight: 1.4 }}>
                {toast.message}
              </div>

              {toast.txHash && (
                <div style={{ marginTop: '8px' }}>
                  <HashChip hash={toast.txHash} type="tx" chars={8} />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-3)',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
