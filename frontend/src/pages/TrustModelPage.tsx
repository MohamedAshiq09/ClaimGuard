import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Scale, 
  ShieldCheck, 
  Lock, 
  Coins, 
  Radio, 
  ExternalLink, 
  ArrowLeft,
  FileCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const TrustModelPage: React.FC = () => {
  const rules = [
    {
      num: 1,
      name: 'ClaimExists',
      desc: 'The claim ID must be registered and active in pallet-contracts storage before any lien or assertion can be anchored.',
    },
    {
      num: 2,
      name: 'DueDateInFuture',
      desc: 'Maturity date must strictly exceed current block_timestamp(). Expired or stale receivables cannot be financed.',
    },
    {
      num: 3,
      name: 'AdvanceCapNotExceeded',
      desc: 'Total accumulated liens across all lenders must never exceed (face_value * max_advance_rate_bps) / 10,000. Prevents double-pledging.',
    },
    {
      num: 4,
      name: 'DocumentHashValid',
      desc: 'Off-chain invoice digest must be exactly 32 non-zero bytes (SHA-256). Preserves confidentiality while guaranteeing immutability.',
    },
    {
      num: 5,
      name: 'AuthorizedSigner',
      desc: 'Only the designated issuer key can register or settle claims, and only designated buyers or approved lenders can modify lien states.',
    },
    {
      num: 6,
      name: 'StatusValidForAction',
      desc: 'Actions must follow the finite state machine transitions (Registered -> Acknowledged -> Pledged -> Settled).',
    },
    {
      num: 7,
      name: 'VerifiedOnly',
      desc: 'When require_verified is true, lenders are blocked from pledging until an optimistic bond challenge window passes without dispute.',
    },
  ];

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <Link 
          to="/app" 
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
          <span>Back to App</span>
        </Link>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--ink)' }}>
          ClaimGuard Trust Model & Formal Guarantees
        </h1>
        <p style={{ margin: 0, fontSize: '15px', color: 'var(--ink-2)', lineHeight: '1.5' }}>
          How ClaimGuard eliminates multi-lender double-financing through deterministic ink! 5.1.1 smart contracts on Portaldot V3.
        </p>
      </div>

      {/* Honest Scope Disclosure */}
      <div 
        style={{ 
          padding: '16px 20px', 
          backgroundColor: 'rgba(14, 159, 142, 0.05)', 
          border: '1px solid rgba(14, 159, 142, 0.25)', 
          borderRadius: 'var(--radius-md)', 
          display: 'flex', 
          gap: '12px',
          alignItems: 'flex-start'
        }}
      >
        <Scale size={20} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: '1.6' }}>
          <strong style={{ color: 'var(--brand)', display: 'block', marginBottom: '2px' }}>
            Honest Architecture & System Scope
          </strong>
          ClaimGuard is not an opaque or overclaimed bridge. It is a single, hardened ink! 5.1.1 contract that acts as the single source of truth for invoice receivables and liens. Cross-chain state awareness is implemented as signed cryptographic snapshots verified by an authorized relayer key.
        </div>
      </div>

      {/* 7 Core Rules */}
      <div className="card" style={{ padding: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--ink)' }}>
          The 7 Invariant Rules Enforced in Rust
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {rules.map((r) => (
            <div 
              key={r.num}
              style={{
                display: 'flex',
                gap: '16px',
                padding: '14px',
                backgroundColor: 'var(--surface-2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}
            >
              <div 
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--brand)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  flexShrink: 0
                }}
              >
                {r.num}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginBottom: '2px' }}>
                  Rule {r.num}: {r.name}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: '1.5' }}>
                  {r.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bonded Verification & Slashing */}
      <div className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
          Bonded Verification & 90/10 Slashing Mechanics
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-2)', lineHeight: '1.6' }}>
          To prevent fraudulent or fabricated invoices from entering the registry, suppliers must post an economic bond (in tPOT). Anyone (including auditors and the debtor) can challenge an unverified assertion during the 24-hour window by matching the counter-bond.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '8px' }}>
          <div style={{ padding: '16px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
              Optimistic Window
            </span>
            <div style={{ fontSize: '18px', fontWeight: 700, margin: '6px 0 4px 0', fontFamily: 'var(--font-mono)' }}>
              24 Hours
            </div>
            <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
              Challenge period before assertion automatically finalizes.
            </span>
          </div>

          <div style={{ padding: '16px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase' }}>
              Slashing Ratio
            </span>
            <div style={{ fontSize: '18px', fontWeight: 700, margin: '6px 0 4px 0', fontFamily: 'var(--font-mono)' }}>
              90% Burn / 10% Bounty
            </div>
            <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
              Malicious bonds are 90% burned; 10% rewards the honest whistleblower.
            </span>
          </div>
        </div>
      </div>

      {/* Contract Verification Link */}
      <div style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--ink)' }}>
            Open Source & On-Chain Deployments
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
            All contract source code is available in contracts/claimguard_core under Apache-2.0.
          </span>
        </div>
        <Link to="/app" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Enter App Dashboard &rarr;
        </Link>
      </div>
    </div>
  );
};
