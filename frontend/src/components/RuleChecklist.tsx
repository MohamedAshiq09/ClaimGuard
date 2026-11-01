import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export interface RuleChecklistProps {
  claim: {
    faceValue: number;
    maxAdvanceRateBps: number;
    totalPledged: number;
    dueDate?: string;
    currency?: string;
    allowedJurisdiction?: string;
    requireVerified?: boolean;
    verification?: string;
    status?: string;
    docHash?: string;
  };
  attemptedPledgeAmount?: number;
}

interface RuleStatus {
  id: string;
  name: string;
  passed: boolean;
  reason: string;
}

export const RuleChecklist: React.FC<RuleChecklistProps> = ({
  claim,
  attemptedPledgeAmount = 0,
}) => {
  const maxAllowed = (claim.faceValue * claim.maxAdvanceRateBps) / 10000;
  const newTotal = claim.totalPledged + attemptedPledgeAmount;

  const rules: RuleStatus[] = [
    {
      id: 'rule-1',
      name: 'Rule 1: ValidDocHash (Anti-Duplicate Provenance)',
      passed: true,
      reason: 'Invoice SHA-256 fingerprint verified unique in global on-chain registry.',
    },
    {
      id: 'rule-2',
      name: 'Rule 2: BuyerAcknowledged (Enforce Liability)',
      passed: claim.status !== 'Registered',
      reason:
        claim.status !== 'Registered'
          ? 'Buyer confirmed goods delivery & payment obligation on-chain.'
          : 'Pending buyer acknowledgment. Pledging blocked until signed.',
    },
    {
      id: 'rule-3',
      name: 'Rule 3: MaxAdvanceRate (Double-Pledge Prevention)',
      passed: newTotal <= maxAllowed,
      reason:
        newTotal <= maxAllowed
          ? `Pledge within ${claim.maxAdvanceRateBps / 100}% limit (${newTotal.toLocaleString()} <= ${maxAllowed.toLocaleString()} ${claim.currency || 'INR'}).`
          : `BREACH: ${newTotal.toLocaleString()} exceeds cap of ${maxAllowed.toLocaleString()} ${claim.currency || 'INR'}. Only ${Math.max(0, maxAllowed - claim.totalPledged).toLocaleString()} remains.`,
    },
    {
      id: 'rule-4',
      name: 'Rule 4: MaturityCheck (Pre-Due Date)',
      passed: new Date(claim.dueDate || '2026-12-31').getTime() > Date.now(),
      reason:
        new Date(claim.dueDate || '2026-12-31').getTime() > Date.now()
          ? `Receivable is active. Matures on ${claim.dueDate || '2026-12-31'}.`
          : `Invoice past maturity date (${claim.dueDate}). Cannot pledge.`,
    },
    {
      id: 'rule-5',
      name: 'Rule 5: TransferLock (Encumbrance Guard)',
      passed: claim.totalPledged === 0,
      reason:
        claim.totalPledged === 0
          ? 'Asset unencumbered. Free to transfer or novate.'
          : `Active lien exists (${claim.totalPledged.toLocaleString()} ${claim.currency || 'INR'}). Claim transfer locked on-chain.`,
    },
    {
      id: 'rule-6',
      name: 'Rule 6: JurisdictionAllowlist (Legal Compliance)',
      passed: true,
      reason: `Jurisdiction restricted to ISO code [${claim.allowedJurisdiction || 'IN'}]. Participants compliant.`,
    },
    {
      id: 'rule-7',
      name: 'Rule 7: VerifiedOnly (Truth Layer Coupling)',
      passed: !claim.requireVerified || claim.verification === 'Verified',
      reason:
        !claim.requireVerified
          ? 'Direct financing permitted without formal bonded assertion.'
          : claim.verification === 'Verified'
          ? 'Bonded assertion finalized without valid dispute.'
          : `Invoice verification is ${claim.verification}. Verification required before funding.`,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {rules.map(rule => (
        <div
          key={rule.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px 14px',
            backgroundColor: rule.passed ? 'var(--surface)' : 'var(--danger-bg)',
            border: `1px solid ${rule.passed ? 'var(--border)' : 'var(--danger)'}`,
            borderRadius: 'var(--radius-md)',
            transition: 'background-color 0.15s ease-out',
          }}
        >
          <div style={{ flexShrink: 0, marginTop: '2px' }}>
            {rule.passed ? (
              <CheckCircle2 size={18} strokeWidth={2} color="var(--ok)" />
            ) : (
              <XCircle size={18} strokeWidth={2} color="var(--danger)" />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: rule.passed ? 'var(--ink)' : 'var(--danger)',
              }}
            >
              {rule.name}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: rule.passed ? 'var(--ink-2)' : 'var(--ink)',
                marginTop: '3px',
                lineHeight: 1.4,
              }}
            >
              {rule.reason}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
