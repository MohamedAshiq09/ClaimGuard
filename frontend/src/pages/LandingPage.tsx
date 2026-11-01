import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Coins,
  FileCheck2,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Scale,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HashChip } from '../components/HashChip';

export const LandingPage: React.FC = () => {
  const { claims, violations, contractAddress } = useApp();

  const totalPledged = claims.reduce((acc, c) => acc + c.totalPledged, 0);
  const blockedAttempts = violations.length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Top Header */}
      <header
        style={{
          height: '70px',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--brand)',
              color: 'var(--brand-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px',
            }}
          >
            CG
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>ClaimGuard</span>
            <span
              style={{
                marginLeft: '8px',
                fontSize: '11px',
                color: 'var(--accent)',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              Portaldot V3
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/trust" style={{ textDecoration: 'none', color: 'var(--ink-2)', fontSize: '13px', fontWeight: 500 }}>
            Trust Model
          </Link>
          <Link to="/app/demo" style={{ textDecoration: 'none', color: 'var(--ink-2)', fontSize: '13px', fontWeight: 500 }}>
            Guided Demo
          </Link>
          <Link to="/app" className="btn btn-primary btn-sm" style={{ padding: '8px 16px' }}>
            Launch App <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '80px 24px 48px 24px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            backgroundColor: 'var(--ok-bg)',
            color: 'var(--ok)',
            borderRadius: 'var(--radius-full)',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '24px',
          }}
        >
          <CheckCircle2 size={14} />
          Live on Portaldot V3 Testnet • ink! 5.1.1 WASM Core
        </div>

        <h1
          className="font-serif"
          style={{
            fontSize: '48px',
            lineHeight: 1.15,
            fontWeight: 700,
            color: 'var(--brand)',
            marginBottom: '20px',
            letterSpacing: '-0.02em',
          }}
        >
          Compliance that travels with the asset.
        </h1>

        <p
          style={{
            fontSize: '20px',
            color: 'var(--ink-2)',
            maxWidth: '680px',
            margin: '0 auto 36px auto',
            lineHeight: 1.5,
          }}
        >
          One invoice. One lien. Backed by a bond. An on-chain receivables registry that makes double-financing mathematically impossible.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <Link to="/app" className="btn btn-primary btn-lg" style={{ padding: '12px 28px', fontSize: '15px' }}>
            Launch App <ArrowRight size={16} />
          </Link>
          <Link to="/app/demo" className="btn btn-secondary btn-lg" style={{ padding: '12px 24px', fontSize: '15px' }}>
            <PlayCircle size={16} /> Watch Guided Demo (2 min)
          </Link>
        </div>
      </section>

      {/* Real Proof Strip */}
      <section style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 24px 60px 24px' }}>
        <div
          className="ledger-card"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', textTransform: 'uppercase', fontWeight: 600 }}>
              Contract Address
            </div>
            <div style={{ marginTop: '6px' }}>
              <HashChip hash={contractAddress} type="address" chars={8} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px' }}>
              Substrate pallet-contracts
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', textTransform: 'uppercase', fontWeight: 600 }}>
              Latest Verified Extrinsic
            </div>
            <div style={{ marginTop: '6px' }}>
              <HashChip hash="0x53c9e6daab66b6c07be3ddad00ffcf9872e411b0e37ab7515e0649733ee8e137" type="tx" chars={8} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ok)', fontWeight: 600, marginTop: '4px' }}>
              Finalized in block
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', textTransform: 'uppercase', fontWeight: 600 }}>
              Blocked Double-Pledges
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--danger)',
                marginTop: '4px',
              }}
              className="font-mono tabular-nums"
            >
              {blockedAttempts} attempts blocked
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }}>
              0 state corruption on-chain
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Value Pledged
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--brand)',
                marginTop: '4px',
              }}
              className="font-mono tabular-nums"
            >
              ₹{(totalPledged / 100000).toFixed(2)} Lakhs
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }}>
              Across {claims.length} registered claims
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step "How It Works" */}
      <section style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 24px 80px 24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, textAlign: 'center', marginBottom: '36px', color: 'var(--brand)' }}>
          How ClaimGuard Eliminates Receivables Fraud
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {/* Step 1 */}
          <div className="ledger-card">
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand)',
                marginBottom: '16px',
                fontWeight: 700,
              }}
            >
              1
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--ink)' }}>
              Register & Fingerprint
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Supplier generates a cryptographic SHA-256 fingerprint of the commercial invoice PDF in the browser. The file stays off-chain while key parameters and buyer obligations are recorded on Portaldot.
            </p>
          </div>

          {/* Step 2 */}
          <div className="ledger-card">
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                marginBottom: '16px',
                fontWeight: 700,
              }}
            >
              2
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--ink)' }}>
              Bonded Verification
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Issuer stakes a financial bond asserting authenticity. If disputed, a 90/10 slashing mechanism penalizes fraudsters and rewards challengers. Truth is secured with economic capital, not paper promises.
            </p>
          </div>

          {/* Step 3 */}
          <div className="ledger-card">
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ok)',
                marginBottom: '16px',
                fontWeight: 700,
              }}
            >
              3
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--ink)' }}>
              Pledge Once. Revert Duplicate.
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Lender A records a financing lien up to the advance limit. If the borrower attempts to pledge to Lender B, the contract strictly reverts with <code>ExceedsAdvanceRate</code>.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '32px 24px', backgroundColor: 'var(--surface)' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--ink-2)' }}>
            ClaimGuard • Portaldot Hacker House 2026 (DoraHacks)
          </div>
          <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
            <Link to="/trust" style={{ color: 'var(--ink-2)', textDecoration: 'none' }}>
              Trust Model & Disclosures
            </Link>
            <a
              href="https://node-console.portaldot.dev/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--ink-2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Explorer <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
