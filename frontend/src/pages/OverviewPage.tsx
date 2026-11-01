import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  Coins,
  ShieldCheck,
  AlertOctagon,
  ArrowRight,
  Clock,
  CheckCircle2,
  Lock,
  PlusCircle,
  Building2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusChip } from '../components/StatusChip';
import { HashChip } from '../components/HashChip';

export const OverviewPage: React.FC = () => {
  const { role, currentProfile, claims, violations, acknowledgeClaim } = useApp();

  const totalRegistered = claims.length;
  const totalPledged = claims.reduce((acc, c) => acc + c.totalPledged, 0);
  const totalVerified = claims.filter(c => c.verification === 'Verified').length;
  const blockedAttempts = violations.length;

  // Role-specific "Needs your attention" panel
  const renderAttentionPanel = () => {
    if (role === 'buyer') {
      const pendingAck = claims.filter(c => c.status === 'Registered');
      return (
        <div
          className="ledger-card"
          style={{
            borderLeft: '4px solid var(--info)',
            marginBottom: '24px',
            backgroundColor: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--info)', fontWeight: 700, textTransform: 'uppercase' }}>
                Buyer Action Required
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginTop: '2px' }}>
                {pendingAck.length > 0
                  ? `${pendingAck.length} invoice awaiting your acknowledgment`
                  : 'All invoices acknowledged'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
                {pendingAck.length > 0
                  ? `Invoice ${pendingAck[0].invoiceNumber} from ${pendingAck[0].issuerName} requires confirmation of liability before factoring.`
                  : 'You have no pending invoices awaiting acknowledgment.'}
              </p>
            </div>

            {pendingAck.length > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => acknowledgeClaim(pendingAck[0].id)}
              >
                Acknowledge Liability for #{pendingAck[0].id}
              </button>
            )}
          </div>
        </div>
      );
    }

    if (role === 'issuer') {
      const unasserted = claims.filter(c => c.requireVerified && c.verification === 'Unverified');
      return (
        <div
          className="ledger-card"
          style={{
            borderLeft: '4px solid var(--accent)',
            marginBottom: '24px',
            backgroundColor: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                Supplier Action Required
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginTop: '2px' }}>
                {unasserted.length > 0
                  ? `${unasserted.length} invoice requires bonded assertion to unlock advance`
                  : 'Ready to request lender financing'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
                Post a financial bond to attest invoice authenticity and start the challenge window.
              </p>
            </div>

            <Link to="/app/verification" className="btn btn-accent">
              Post Bond in Verification Center <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      );
    }

    if (role === 'lender') {
      return (
        <div
          className="ledger-card"
          style={{
            borderLeft: '4px solid var(--warn)',
            marginBottom: '24px',
            backgroundColor: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--warn)', fontWeight: 700, textTransform: 'uppercase' }}>
                Financier Risk Desk
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginTop: '2px' }}>
                Check 7 Invariants Before Disbursement
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
                Test your prospective advance against the shared LienManager to prevent duplicate financing.
              </p>
            </div>

            <Link to="/app/lender" className="btn btn-primary">
              Open Lender Desk <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            Overview
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Active as <strong>{currentProfile.name}</strong> ({currentProfile.label})
          </p>
        </div>

        <Link to="/app/claims/new" className="btn btn-primary">
          <PlusCircle size={15} /> Register Claim
        </Link>
      </div>

      {/* Role-Specific "Needs Attention" Panel */}
      {renderAttentionPanel()}

      {/* 4 Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div className="ledger-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--ink-3)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Claims Registered</span>
            <FileSpreadsheet size={16} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--brand)', marginTop: '8px' }} className="font-mono tabular-nums">
            {totalRegistered}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Sealed with SHA-256 doc hash
          </div>
        </div>

        <div className="ledger-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--ink-3)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Total Pledged</span>
            <Coins size={16} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent)', marginTop: '8px' }} className="font-mono tabular-nums">
            ₹{(totalPledged / 100000).toFixed(2)}L
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Across active senior liens
          </div>
        </div>

        <div className="ledger-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--ink-3)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Blocked Double-Pledges</span>
            <AlertOctagon size={16} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--danger)', marginTop: '8px' }} className="font-mono tabular-nums">
            {blockedAttempts}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 600, marginTop: '4px' }}>
            Reverted on-chain with zero state loss
          </div>
        </div>

        <div className="ledger-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--ink-3)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Verified Claims</span>
            <ShieldCheck size={16} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--ok)', marginTop: '8px' }} className="font-mono tabular-nums">
            {totalVerified}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Backed by bonded attestation
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="ledger-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)' }}>Recent Receivables Activity</h2>
            <p style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '2px' }}>
              Live lifecycle events recorded on Portaldot V3
            </p>
          </div>

          <Link to="/app/claims" className="btn btn-secondary btn-sm">
            View All Claims <ArrowRight size={13} />
          </Link>
        </div>

        <div className="table-wrapper">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Buyer</th>
                <th>Face Value</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Advance Used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {claims.slice(0, 4).map(claim => {
                const maxAllowed = (claim.faceValue * claim.maxAdvanceRateBps) / 10000;
                return (
                  <tr key={claim.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--brand)' }}>{claim.invoiceNumber}</span>
                      <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Claim #{claim.id}</div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--ink)' }}>{claim.buyerName}</span>
                      <div style={{ marginTop: '2px' }}>
                        <HashChip hash={claim.buyer} type="address" chars={4} />
                      </div>
                    </td>
                    <td className="font-mono tabular-nums">
                      <span style={{ fontWeight: 600 }}>{claim.faceValue.toLocaleString()}</span> {claim.currency}
                    </td>
                    <td>
                      <StatusChip status={claim.status} type="claim" />
                    </td>
                    <td>
                      <StatusChip status={claim.verification} type="verification" />
                    </td>
                    <td className="font-mono tabular-nums" style={{ minWidth: '160px' }}>
                      <span style={{ fontWeight: 600 }}>{claim.totalPledged.toLocaleString()}</span>
                      <span style={{ color: 'var(--ink-3)' }}> / {maxAllowed.toLocaleString()}</span>
                    </td>
                    <td>
                      <Link to={`/app/claims/${claim.id}`} className="btn btn-secondary btn-sm">
                        Inspect
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
