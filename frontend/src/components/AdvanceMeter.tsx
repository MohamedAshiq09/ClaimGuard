import React from 'react';

export interface AdvanceMeterProps {
  pledged?: number;
  totalPledged?: number;
  maxAllowed?: number;
  faceValue?: number;
  maxAdvanceRateBps?: number;
  currency?: string;
  compact?: boolean;
  showFigures?: boolean;
}

export const AdvanceMeter: React.FC<AdvanceMeterProps> = ({
  pledged,
  totalPledged,
  maxAllowed,
  faceValue,
  maxAdvanceRateBps,
  currency = 'INR',
  compact = false,
  showFigures = true,
}) => {
  const effectivePledged = pledged !== undefined ? pledged : (totalPledged || 0);
  const effectiveMax = maxAllowed !== undefined 
    ? maxAllowed 
    : (faceValue && maxAdvanceRateBps ? Math.floor((faceValue * maxAdvanceRateBps) / 10000) : 0);

  const percentage = effectiveMax > 0 ? Math.min(100, Math.round((effectivePledged / effectiveMax) * 100)) : 0;

  // Turns amber near the limit (>85%), red at the limit (100%)
  let barColor = 'var(--accent)';
  if (percentage >= 100) {
    barColor = 'var(--danger)';
  } else if (percentage >= 85) {
    barColor = 'var(--warn)';
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Track bar */}
      <div
        style={{
          width: '100%',
          height: compact ? '6px' : '8px',
          backgroundColor: 'var(--surface-3)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            backgroundColor: barColor,
            transition: 'width 0.25s ease-out, background-color 0.25s ease-out',
            borderRadius: 'var(--radius-full)',
          }}
        />
      </div>

      {/* Numbers under bar */}
      {showFigures && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: compact ? '4px' : '6px',
            fontSize: compact ? '11px' : '12px',
            color: 'var(--ink-2)',
          }}
          className="font-mono tabular-nums"
        >
          <span>
            <strong style={{ color: 'var(--ink)' }}>{effectivePledged.toLocaleString()}</strong>
            {' / '}
            {effectiveMax.toLocaleString()} {currency}
          </span>
          <span style={{ fontWeight: 600, color: barColor }}>{percentage}%</span>
        </div>
      )}
    </div>
  );
};
