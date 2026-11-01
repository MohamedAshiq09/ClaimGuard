import React, { useState } from 'react';
import { 
  Building2, 
  Coins, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  TrendingUp,
  Lock,
  Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AdvanceMeter } from '../components/AdvanceMeter';
import { RuleChecklist } from '../components/RuleChecklist';
import { BlockBanner } from '../components/BlockBanner';
import { StatusChip } from '../components/StatusChip';

export const LenderDeskPage: React.FC = () => {
  const { claims, pledgeClaim, currentProfile, role } = useApp();
  const [selectedClaimId, setSelectedClaimId] = useState<number>(claims[0]?.id || 1);
  const [pledgeAmount, setPledgeAmount] = useState<number>(100000);
  const [lastRejection, setLastRejection] = useState<{
    ruleName: string;
    attemptedAmount: number;
    reason: string;
    txHash?: string;
  } | null>(null);

  const claim = claims.find((c) => c.id === selectedClaimId) || claims[0];
  const maxAllowed = claim ? Math.floor((claim.faceValue * claim.maxAdvanceRateBps) / 10000) : 0;
  const remaining = claim ? Math.max(0, maxAllowed - claim.totalPledged) : 0;
  const symbol = claim?.currency === 'INR' ? '₹' : '$';

  const handlePledge = () => {
    setLastRejection(null);
    const result = pledgeClaim(claim.id, currentProfile.address, pledgeAmount);
    if (!result.success && result.error) {
      setLastRejection({
        ruleName: result.error.includes('Advance') ? 'ExceedsAdvanceRate' : 'VerifiedOnly',
        attemptedAmount: pledgeAmount,
        reason: result.error,
        txHash: result.txHash,
      });
    }
  };

  const handleSimulateDoublePledge = () => {
    // Attempt to pledge exceeding amount or on already pledged claim
    const doublePledgeAmt = remaining > 0 ? remaining + 50000 : 800000;
    setPledgeAmount(doublePledgeAmt);
    const result = pledgeClaim(claim.id, currentProfile.address, doublePledgeAmt);
    if (!result.success && result.error) {
      setLastRejection({
        ruleName: 'ExceedsAdvanceRate',
        attemptedAmount: doublePledgeAmt,
        reason: result.error,
        txHash: result.txHash,
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--ink)' }}>
          Lender Desk & Invariant Checker
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink-2)' }}>
          Financiers inspect on-chain commitments, simulate risk, and execute lien registrations protected by the 7 invariants.
        </p>
      </div>

      {lastRejection && (
        <BlockBanner
          ruleName={lastRejection.ruleName}
          attemptedAmount={lastRejection.attemptedAmount}
          reason={lastRejection.reason}
          txHash={lastRejection.txHash}
          currency={claim?.currency}
          onDismiss={() => setLastRejection(null)}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Select Claim & Financial Status */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
            Select Receivable to Finance
          </h2>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
              Claim Target
            </label>
            <select
              value={selectedClaimId}
              onChange={(e) => setSelectedClaimId(Number(e.target.value))}
              className="input-field"
            >
              {claims.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.id} - {c.invoiceNumber} ({c.buyerName}) - {c.currency === 'INR' ? '₹' : '$'}{c.faceValue.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {claim && (
            <>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <StatusChip status={claim.status} />
                <StatusChip status={claim.verification} />
                <span style={{ fontSize: '12px', color: 'var(--ink-3)', marginLeft: 'auto' }}>
                  Due {claim.dueDate}
                </span>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <AdvanceMeter
                  faceValue={claim.faceValue}
                  totalPledged={claim.totalPledged}
                  maxAdvanceRateBps={claim.maxAdvanceRateBps}
                  currency={claim.currency}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Face Value</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{symbol}{claim.faceValue.toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Allowed Advance Cap</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
                    {symbol}{maxAllowed.toLocaleString()} ({(claim.maxAdvanceRateBps / 100).toFixed(0)}%)
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Current Encumbrance</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{symbol}{claim.totalPledged.toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Available Capacity</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: remaining === 0 ? 'var(--danger)' : 'var(--ink)' }}>
                    {symbol}{remaining.toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Panel: Execute Pledge or Simulate Double-Pledge */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
            Lender Action & Attack Simulation
          </h2>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
              Financing / Pledge Amount ({symbol})
            </label>
            <input
              type="number"
              value={pledgeAmount}
              onChange={(e) => setPledgeAmount(Number(e.target.value))}
              className="input-field"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px', display: 'block' }}>
              Active Lender Key: {currentProfile.name}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={handlePledge}
              className="btn btn-primary"
              style={{ justifyContent: 'center', padding: '12px' }}
              id="btn-execute-pledge"
            >
              <Coins size={16} style={{ marginRight: '8px' }} />
              Execute Pledge Extrinsic
            </button>

            <button
              type="button"
              onClick={handleSimulateDoublePledge}
              className="btn"
              style={{ 
                justifyContent: 'center', 
                padding: '10px',
                backgroundColor: 'rgba(217, 48, 37, 0.08)',
                color: 'var(--danger)',
                border: '1px solid rgba(217, 48, 37, 0.3)'
              }}
              id="btn-simulate-double-pledge"
            >
              <ShieldAlert size={16} style={{ marginRight: '8px' }} />
              Simulate Double-Pledge Attack
            </button>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--ink-2)' }}>
            <strong>How ClaimGuard Protects Lenders:</strong> Even if a malicious borrower presents the same invoice to multiple financiers simultaneously, the Portaldot contract rejects subsequent pledges atomically at the state machine level.
          </div>
        </div>
      </div>

      {/* 7 Core Invariants Checklist */}
      {claim && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: 'var(--ink)' }}>
            Contract Invariant Pre-Flight Evaluation for Amount: {symbol}{pledgeAmount.toLocaleString()}
          </h2>
          <RuleChecklist
            claim={{
              faceValue: claim.faceValue,
              dueDate: claim.dueDate,
              maxAdvanceRateBps: claim.maxAdvanceRateBps,
              docHash: claim.docHash,
              totalPledged: claim.totalPledged,
              status: claim.status,
              verification: claim.verification,
              requireVerified: claim.requireVerified,
            }}
            attemptedPledgeAmount={pledgeAmount}
          />
        </div>
      )}
    </div>
  );
};
