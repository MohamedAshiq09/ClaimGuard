import React from 'react';
import { Check } from 'lucide-react';
import type { ClaimStatus, VerificationStatus } from '../context/AppContext';

export interface StatusStepperProps {
  claimStatus?: ClaimStatus;
  currentStatus?: ClaimStatus;
  verificationStatus: VerificationStatus;
}

const STEPS = [
  { key: 'Registered', label: 'Registered' },
  { key: 'Acknowledged', label: 'Acknowledged' },
  { key: 'Verified', label: 'Verified' },
  { key: 'Pledged', label: 'Pledged' },
  { key: 'Settled', label: 'Settled' },
];

export const StatusStepper: React.FC<StatusStepperProps> = ({
  claimStatus,
  currentStatus,
  verificationStatus,
}) => {
  const effectiveStatus = claimStatus || currentStatus || 'Registered';
  // Determine active step index
  let activeIndex = 0;
  if (effectiveStatus === 'Settled') {
    activeIndex = 4;
  } else if (claimStatus === 'Pledged') {
    activeIndex = 3;
  } else if (verificationStatus === 'Verified') {
    activeIndex = 2;
  } else if (claimStatus === 'Acknowledged') {
    activeIndex = 1;
  } else {
    activeIndex = 0;
  }

  return (
    <div style={{ width: '100%', padding: '16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        {STEPS.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <React.Fragment key={step.key}>
              {/* Node container */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  zIndex: 2,
                  minWidth: '80px',
                }}
              >
                {/* Node Circle */}
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    transition: 'all 0.2s ease-out',
                    backgroundColor: isCompleted
                      ? 'var(--accent)'
                      : isCurrent
                      ? 'var(--surface)'
                      : 'var(--surface-3)',
                    color: isCompleted
                      ? '#FFFFFF'
                      : isCurrent
                      ? 'var(--accent)'
                      : 'var(--ink-3)',
                    border: isCurrent
                      ? '2px solid var(--accent)'
                      : isCompleted
                      ? '2px solid var(--accent)'
                      : '2px solid var(--border)',
                  }}
                >
                  {isCompleted ? <Check size={14} strokeWidth={2.5} /> : idx + 1}
                </div>

                {/* Step Label */}
                <span
                  style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    fontWeight: isCurrent ? 600 : 500,
                    color: isCurrent
                      ? 'var(--ink)'
                      : isCompleted
                      ? 'var(--accent)'
                      : 'var(--ink-3)',
                    textAlign: 'center',
                  }}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting Line between nodes */}
              {idx < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: '2px',
                    backgroundColor: idx < activeIndex ? 'var(--accent)' : 'var(--border)',
                    margin: '0 -4px 20px -4px',
                    transition: 'background-color 0.2s ease-out',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
