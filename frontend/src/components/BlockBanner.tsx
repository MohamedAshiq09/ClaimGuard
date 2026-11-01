import React from 'react';
import { AlertOctagon, ArrowRight } from 'lucide-react';
import { HashChip } from './HashChip';

interface BlockBannerProps {
  ruleName: string;
  reason: string;
  attemptedAmount?: number;
  currency?: string;
  txHash?: string | null;
  onDismiss?: () => void;
}

export const BlockBanner: React.FC<BlockBannerProps> = ({
  ruleName,
  reason,
  attemptedAmount,
  currency = 'INR',
  txHash,
  onDismiss,
}) => {
  return (
    <div className="block-banner">
      <div style={{ flexShrink: 0, marginTop: '2px' }}>
        <AlertOctagon size={24} strokeWidth={2} color="var(--danger)" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '15px', color: 'var(--danger)', fontWeight: 700 }}>
            Invariant Rejection: {ruleName}
          </strong>
          {attemptedAmount !== undefined && (
            <span
              style={{
                backgroundColor: 'var(--danger)',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '4px',
              }}
              className="font-mono tabular-nums"
            >
              Attempt: {attemptedAmount.toLocaleString()} {currency}
            </span>
          )}
        </div>

        <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5 }}>
          {reason}
        </p>

        {txHash && (
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>On-Chain Extrinsic:</span>
            <HashChip hash={txHash} type="tx" chars={8} />
            <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 600 }}>
              (Included in block with failed result)
            </span>
          </div>
        )}

        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a
            href="/app/audit"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--danger)',
              textDecoration: 'none',
            }}
          >
            Inspect permanent audit feed <ArrowRight size={13} />
          </a>
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            lineHeight: 1,
            cursor: 'pointer',
            color: 'var(--danger)',
            opacity: 0.7,
            padding: '2px 6px',
          }}
          title="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
};
