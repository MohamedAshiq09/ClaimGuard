import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ExternalLink, 
  Calendar, 
  Building, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  History,
  Coins
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusChip } from '../components/StatusChip';
import { AdvanceMeter } from '../components/AdvanceMeter';
import { HashChip } from '../components/HashChip';
import { StatusStepper } from '../components/StatusStepper';
import { RuleChecklist } from '../components/RuleChecklist';

export const ClaimDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { claims, acknowledgeClaim, pledgeClaim, role, currentProfile, addToast } = useApp();

  const claimIdNum = Number(id);
  const claim = claims.find((c) => c.id === claimIdNum);

  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'liens' | 'verification'>('overview');
  const [pledgeAmount, setPledgeAmount] = useState<number>(100000);

  if (!claim) {
    return (
      <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink)' }}>Claim Not Found</h2>
        <p style={{ color: 'var(--ink-2)', fontSize: '14px', marginBottom: '20px' }}>
          No registered receivable found for claim ID #{id}.
        </p>
        <Link to="/app/claims" className="btn btn-secondary">
          &larr; Return to Claims Registry
        </Link>
      </div>
    );
  }

  const maxAllowed = Math.floor((claim.faceValue * claim.maxAdvanceRateBps) / 10000);
  const remaining = Math.max(0, maxAllowed - claim.totalPledged);
  const symbol = claim.currency === 'INR' ? '₹' : '$';

  const handleAcknowledge = () => {
    acknowledgeClaim(claim.id);
  };

  const handleQuickPledge = () => {
    pledgeClaim(claim.id, currentProfile.address, pledgeAmount);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb & Navigation */}
      <div>
        <Link 
          to="/app/claims" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '13px', 
            color: 'var(--ink-2)', 
            textDecoration: 'none',
            marginBottom: '12px' 
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Claims Registry</span>
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                {claim.invoiceNumber}
              </h1>
              <StatusChip status={claim.status} />
              <StatusChip status={claim.verification} />
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--ink-2)' }}>
              Registered on {claim.registeredAt} • Jurisdiction {claim.allowedJurisdiction} • Due {claim.dueDate}
            </p>
          </div>

          {/* Contextual Actions based on Role */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {role === 'buyer' && claim.status === 'Registered' && (
              <button 
                type="button" 
                onClick={handleAcknowledge}
                className="btn btn-primary"
                id="btn-buyer-acknowledge"
              >
                <CheckCircle2 size={16} style={{ marginRight: '6px' }} />
                Acknowledge Liability
              </button>
            )}

            <Link to="/app/lender" className="btn btn-secondary">
              <Coins size={16} style={{ marginRight: '6px' }} />
              Open in Lender Desk
            </Link>
          </div>
        </div>
      </div>

      {/* Lifecycle Progress Stepper */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: '16px' }}>
          Asset Lifecycle State
        </div>
        <StatusStepper currentStatus={claim.status} verificationStatus={claim.verification} />
      </div>

      {/* Main Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Left: Financial & Counterparty Terms */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
            Financial Capacity & Metrics
          </h2>

          <div style={{ padding: '16px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <AdvanceMeter
              faceValue={claim.faceValue}
              totalPledged={claim.totalPledged}
              maxAdvanceRateBps={claim.maxAdvanceRateBps}
              currency={claim.currency}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Face Value</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px' }}>
                {symbol}{claim.faceValue.toLocaleString()} {claim.currency}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Max Borrowable Cap</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px', color: 'var(--accent)' }}>
                {symbol}{maxAllowed.toLocaleString()} ({(claim.maxAdvanceRateBps / 100).toFixed(0)}%)
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Total Pledged to Date</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {symbol}{claim.totalPledged.toLocaleString()}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Remaining Headroom</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: remaining === 0 ? 'var(--danger)' : 'var(--ink)' }}>
                {symbol}{remaining.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Counterparties & Document Security */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
            Counterparties & Document Integrity
          </h2>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block', marginBottom: '4px' }}>
              Supplier (Claim Issuer)
            </span>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '2px' }}>
              {claim.issuerName}
            </div>
            <HashChip hash={claim.issuer} type="account" />
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block', marginBottom: '4px' }}>
              Debtor (Corporate Buyer)
            </span>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '2px' }}>
              {claim.buyerName}
            </div>
            <HashChip hash={claim.buyer} type="account" />
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block', marginBottom: '4px' }}>
              Off-Chain Document SHA-256 Digest
            </span>
            <HashChip hash={claim.docHash} type="hash" />
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px' }}>
              Confidentiality preserved: Raw invoice stays off-chain.
            </div>
          </div>
        </div>
      </div>

      {/* Tabs / Sub-Views: Rules & Verification */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            style={{
              background: 'none',
              border: 'none',
              fontWeight: activeTab === 'overview' ? 700 : 500,
              color: activeTab === 'overview' ? 'var(--brand)' : 'var(--ink-3)',
              cursor: 'pointer',
              fontSize: '14px',
              paddingBottom: '4px',
              borderBottom: activeTab === 'overview' ? '2px solid var(--brand)' : 'none',
            }}
          >
            Core Rules Checklist
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('liens')}
            style={{
              background: 'none',
              border: 'none',
              fontWeight: activeTab === 'liens' ? 700 : 500,
              color: activeTab === 'liens' ? 'var(--brand)' : 'var(--ink-3)',
              cursor: 'pointer',
              fontSize: '14px',
              paddingBottom: '4px',
              borderBottom: activeTab === 'liens' ? '2px solid var(--brand)' : 'none',
            }}
          >
            Registered Liens ({claim.activeLienCount})
          </button>
        </div>

        {activeTab === 'overview' ? (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px 0', color: 'var(--ink)' }}>
              Active Invariant Status on Portaldot Testnet
            </h3>
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
              attemptedPledgeAmount={remaining > 0 ? remaining : 10000}
            />
          </div>
        ) : (
          <div>
            {claim.activeLienCount === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ink-3)' }}>
                No active liens registered against this invoice yet. Financiers can inspect invariants in the Lender Desk.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Lien #</th>
                      <th>Lender</th>
                      <th>Encumbered Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>#1</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>Lender A (Trade Credit Fund)</span>
                        <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                          5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {symbol}{claim.totalPledged.toLocaleString()}
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                          Active On-Chain
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
