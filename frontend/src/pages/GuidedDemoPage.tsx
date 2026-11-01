import React, { useState } from 'react';
import { 
  PlayCircle, 
  CheckCircle2, 
  ShieldAlert, 
  Coins, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  Building,
  Lock,
  Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusChip } from '../components/StatusChip';
import { AdvanceMeter } from '../components/AdvanceMeter';
import { BlockBanner } from '../components/BlockBanner';

export const GuidedDemoPage: React.FC = () => {
  const { claims, pledgeClaim, acknowledgeClaim, updateClaim } = useApp();
  const [demoStep, setDemoStep] = useState<number>(1);
  const [lastRejection, setLastRejection] = useState<{
    ruleName: string;
    attemptedAmount: number;
    reason: string;
    txHash?: string;
  } | null>(null);

  // Focus on Claim #1 (INV-2026-1042)
  const claim = claims.find((c) => c.id === 1) || claims[0];

  const resetDemo = () => {
    setDemoStep(1);
    setLastRejection(null);
    updateClaim(1, {
      status: 'Acknowledged',
      totalPledged: 0,
      activeLienCount: 0,
    });
  };

  const executeLegitimatePledge = () => {
    // Lender A pledges 800,000 (80% advance cap)
    const res = pledgeClaim(1, '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy', 800000);
    if (res.success) {
      setDemoStep(3);
    }
  };

  const executeFraudulentDoublePledge = () => {
    // Lender B attempts to pledge another 800,000
    const res = pledgeClaim(1, '5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM', 800000);
    if (!res.success && res.error) {
      setLastRejection({
        ruleName: 'ExceedsAdvanceRate',
        attemptedAmount: 800000,
        reason: res.error,
        txHash: res.txHash,
      });
      setDemoStep(4);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--ink)' }}>
            Guided Double-Pledge Defense Demo
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink-2)' }}>
            Interactive walkthrough: Watch Portaldot V3 testnet block a simultaneous ₹800,000 double-financing attempt.
          </p>
        </div>

        <button
          type="button"
          onClick={resetDemo}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RotateCcw size={14} />
          <span>Reset Simulation</span>
        </button>
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

      {/* Stepper Narrative Cards */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Step 1: The Scenario */}
        <div style={{ borderLeft: demoStep >= 1 ? '3px solid var(--accent)' : '3px solid var(--border)', paddingLeft: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: demoStep === 1 ? 'var(--brand)' : 'var(--ink)' }}>
              1. The Commercial Context
            </span>
            {demoStep > 1 && <CheckCircle2 size={16} color="var(--accent)" />}
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--ink-2)', lineHeight: '1.5' }}>
            Meena (Tiruppur Garments) delivers ₹1,000,000 of goods to National Retail Chain Corp. The invoice INV-2026-1042 is registered on Portaldot with an 80% max advance cap (₹800,000). The buyer has verified receipt.
          </p>
          {demoStep === 1 && (
            <button
              type="button"
              onClick={() => setDemoStep(2)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>Continue to Step 2: Legitimate Financing</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* Step 2: Lender A Financing */}
        <div style={{ borderLeft: demoStep >= 2 ? '3px solid var(--accent)' : '3px solid var(--border)', paddingLeft: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: demoStep === 2 ? 'var(--brand)' : 'var(--ink)' }}>
              2. Lender A Finances 80% (₹800,000)
            </span>
            {demoStep > 2 && <CheckCircle2 size={16} color="var(--accent)" />}
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--ink-2)', lineHeight: '1.5' }}>
            Lender A performs invariant evaluation on Portaldot and executes a pledge extrinsic for ₹800,000. The lien is registered on-chain and capacity reaches 100%.
          </p>
          {demoStep === 2 && (
            <button
              type="button"
              onClick={executeLegitimatePledge}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Coins size={14} />
              <span>Simulate Lender A Pledging ₹800,000</span>
            </button>
          )}
        </div>

        {/* Step 3: Malicious Borrower Attempts Double-Pledge */}
        <div style={{ borderLeft: demoStep >= 3 ? '3px solid var(--accent)' : '3px solid var(--border)', paddingLeft: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: demoStep === 3 ? 'var(--brand)' : 'var(--ink)' }}>
              3. Malicious Duplicate Financing Attempt
            </span>
            {demoStep > 3 && <CheckCircle2 size={16} color="var(--accent)" />}
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--ink-2)', lineHeight: '1.5' }}>
            The borrower approaches Lender B with the exact same invoice, hoping to borrow another ₹800,000. Lender B broadcasts the pledge extrinsic to Portaldot.
          </p>
          {demoStep === 3 && (
            <button
              type="button"
              onClick={executeFraudulentDoublePledge}
              className="btn"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px',
                backgroundColor: 'rgba(217, 48, 37, 0.08)',
                color: 'var(--danger)',
                border: '1px solid rgba(217, 48, 37, 0.3)'
              }}
            >
              <ShieldAlert size={14} />
              <span>Trigger Lender B Double-Pledge Attack</span>
            </button>
          )}
        </div>

        {/* Step 4: Defense & Resolution */}
        {demoStep === 4 && (
          <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--accent)' }}>
                4. Atomic Interception Verified
              </span>
              <CheckCircle2 size={16} color="var(--accent)" />
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--ink)', lineHeight: '1.5' }}>
              The Portaldot node evaluated Rule 3 (Advance Cap Exceeded). The transaction was aborted at zero block cost, the second lender lost nothing, and the audit feed recorded the incident.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={resetDemo} className="btn btn-secondary">
                Run Scenario Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live State of the Demo Claim */}
      {claim && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
              Current State of Demo Asset: {claim.invoiceNumber}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <StatusChip status={claim.status} size="sm" />
              <StatusChip status={claim.verification} size="sm" />
            </div>
          </div>
          <AdvanceMeter
            faceValue={claim.faceValue}
            totalPledged={claim.totalPledged}
            maxAdvanceRateBps={claim.maxAdvanceRateBps}
            currency={claim.currency}
          />
        </div>
      )}
    </div>
  );
};
