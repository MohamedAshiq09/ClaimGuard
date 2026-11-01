import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Coins, 
  AlertTriangle, 
  Clock, 
  Scale, 
  CheckCircle2, 
  XCircle,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusChip } from '../components/StatusChip';
import { HashChip } from '../components/HashChip';

export const VerificationCenterPage: React.FC = () => {
  const { claims, updateClaim, addToast, role, currentProfile } = useApp();
  const [selectedClaimId, setSelectedClaimId] = useState<number>(2);

  const claim = claims.find((c) => c.id === selectedClaimId) || claims[0];

  const handleAssert = () => {
    if (!claim) return;
    updateClaim(claim.id, {
      verification: 'Asserted',
      asserterBond: 2500,
      challengeDeadline: Date.now() + 86400000, // 24h window
    });
    addToast({
      type: 'success',
      title: 'Optimistic Assertion Posted',
      message: `Bond of 2,500 tPOT staked for claim #${claim.id}. 24h challenge window opened.`,
    });
  };

  const handleChallenge = () => {
    if (!claim) return;
    updateClaim(claim.id, {
      verification: 'Disputed',
    });
    addToast({
      type: 'danger',
      title: 'Challenge Extrinsic Recorded',
      message: `Counter-bond posted by ${currentProfile.name}. Escalated to governance resolver.`,
    });
  };

  const handleResolve = (verified: boolean) => {
    if (!claim) return;
    updateClaim(claim.id, {
      verification: verified ? 'Verified' : 'Rejected',
    });
    addToast({
      type: verified ? 'success' : 'danger',
      title: verified ? 'Assertion Upheld' : 'Assertion Slashed (90/10 Split)',
      message: verified 
        ? `Claim #${claim.id} verified. Asserter bond returned with challenge fee.` 
        : `Claim #${claim.id} rejected. Fraudulent bond slashed: 90% burned, 10% awarded to challenger.`,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--ink)' }}>
          Bonded Verification Center
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink-2)' }}>
          Optimistic bonded dispute mechanism: Invoices are asserted with economic stake, challenged by auditors, and resolved with 90/10 slashing.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Claim Selector & Assertion State */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
            Target Claim Assertion Status
          </h2>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
              Select Invoice to Verify / Challenge
            </label>
            <select
              value={selectedClaimId}
              onChange={(e) => setSelectedClaimId(Number(e.target.value))}
              className="input-field"
            >
              {claims.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.id} - {c.invoiceNumber} ({c.verification})
                </option>
              ))}
            </select>
          </div>

          {claim && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>Current Verification</span>
                <StatusChip status={claim.verification} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>Debtor / Buyer</span>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{claim.buyerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>Active Bond Staked</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
                  {claim.asserterBond ? `${claim.asserterBond} tPOT` : '0 tPOT'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>Challenge Window</span>
                <span style={{ fontSize: '12px', fontWeight: 500 }}>
                  {claim.verification === 'Asserted' ? 'Active (~24 hours remaining)' : 'Closed'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bond Actions & Protocol Economics */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
            Cryptoeconomic Game Actions
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={handleAssert}
              disabled={claim?.verification === 'Asserted' || claim?.verification === 'Verified'}
              className="btn btn-primary"
              style={{ justifyContent: 'center', padding: '12px' }}
            >
              <Coins size={16} style={{ marginRight: '8px' }} />
              Post 2,500 tPOT Assertion Bond
            </button>

            <button
              type="button"
              onClick={handleChallenge}
              disabled={claim?.verification !== 'Asserted'}
              className="btn btn-secondary"
              style={{ justifyContent: 'center', padding: '12px' }}
            >
              <AlertTriangle size={16} style={{ marginRight: '8px' }} />
              Challenge Claim (Auditor Counter-Bond)
            </button>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => handleResolve(true)}
                disabled={claim?.verification !== 'Disputed'}
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <CheckCircle2 size={15} style={{ marginRight: '6px' }} />
                Uphold Assertion
              </button>
              <button
                type="button"
                onClick={() => handleResolve(false)}
                disabled={claim?.verification !== 'Disputed'}
                className="btn"
                style={{ 
                  flex: 1, 
                  justifyContent: 'center',
                  backgroundColor: 'rgba(217, 48, 37, 0.08)',
                  color: 'var(--danger)',
                  border: '1px solid rgba(217, 48, 37, 0.3)'
                }}
              >
                <XCircle size={15} style={{ marginRight: '6px' }} />
                Slash Bond (90/10)
              </button>
            </div>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--ink-2)' }}>
            <strong>Slashing Formula:</strong> When an assertion is successfully challenged as fraudulent, the contract burns 90% of the bond and rewards the whistleblower challenger with 10%, aligning economic incentives against spam or fake invoices.
          </div>
        </div>
      </div>
    </div>
  );
};
