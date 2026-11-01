import React, { useState } from 'react';
import { 
  Radio, 
  ShieldCheck, 
  ExternalLink, 
  Copy, 
  Check, 
  Terminal, 
  AlertCircle,
  FileCode,
  Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HashChip } from '../components/HashChip';

export const SnapshotInspectorPage: React.FC = () => {
  const { claims, contractAddress } = useApp();
  const [selectedClaimId, setSelectedClaimId] = useState<number>(1);
  const [copied, setCopied] = useState(false);

  const claim = claims.find((c) => c.id === selectedClaimId) || claims[0];

  // Cryptographic snapshot payload
  const snapshotData = {
    claimId: claim?.id || 1,
    invoiceNumber: claim?.invoiceNumber || 'INV-2026-1042',
    issuer: claim?.issuer || '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    faceValue: claim?.faceValue || 1000000,
    currency: claim?.currency || 'INR',
    totalPledged: claim?.totalPledged || 800000,
    status: claim?.status || 'Pledged',
    verification: claim?.verification || 'Verified',
    blockNumber: 142857,
    contract: contractAddress,
    timestamp: '2026-11-01T15:45:00Z',
    relayerSignature: '0x9d4a8f3b2e1c0d5a7b9e8f1c3d5a7b9e8f1c3d5a7b9e8f1c3d5a7b9e8f1c3d5a7b9e8f1c3d5a7b9e8f1c3d5a7b9e8f1c3d5a7b9e8f1c3d5a7b9e8f1c3d5a7b9e',
    verifierAlgorithm: 'sr25519 / schnorrkel',
  };

  const copySnapshot = () => {
    navigator.clipboard.writeText(JSON.stringify(snapshotData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--ink)' }}>
          Signed Snapshot Inspector
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink-2)' }}>
          Export cryptographic state snapshots of receivables and liens signed by authorized Portaldot node validators.
        </p>
      </div>

      {/* Honest Scope Disclosure as mandated by brief and anchor.md */}
      <div 
        style={{ 
          padding: '14px 18px', 
          backgroundColor: 'rgba(235, 134, 0, 0.08)', 
          border: '1px solid rgba(235, 134, 0, 0.3)', 
          borderRadius: 'var(--radius-md)', 
          display: 'flex', 
          gap: '12px',
          alignItems: 'flex-start'
        }}
      >
        <AlertCircle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '12px', color: 'var(--ink)', lineHeight: '1.5' }}>
          <strong style={{ color: 'var(--warning)', display: 'block', marginBottom: '2px' }}>
            Honest Architecture Disclosure
          </strong>
          Signed snapshot verified by a second environment (simulated). The relayer operates as a trusted signer. Calling this a decentralized cross-chain bridge would overclaim; it is a verifiable off-chain attestor for cross-ledger awareness.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Select Claim & Parameters */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
            Snapshot Source & Invariant Proof
          </h2>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
              Select Invoice Record
            </label>
            <select
              value={selectedClaimId}
              onChange={(e) => setSelectedClaimId(Number(e.target.value))}
              className="input-field"
            >
              {claims.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.id} - {c.invoiceNumber} ({c.status})
                </option>
              ))}
            </select>
          </div>

          <div style={{ backgroundColor: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-3)' }}>Source Chain</span>
              <span style={{ fontWeight: 600 }}>Portaldot V3 Testnet (#3002)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-3)' }}>Cryptographic Scheme</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>sr25519 Schnorrkel</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-3)' }}>Contract Address</span>
              <HashChip hash={contractAddress} type="account" />
            </div>
          </div>
        </div>

        {/* Payload Display & Verification */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
              Attestation JSON Payload
            </h2>
            <button
              type="button"
              onClick={copySnapshot}
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              {copied ? <Check size={12} color="var(--accent)" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>

          <pre
            style={{
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--ink)',
              overflowX: 'auto',
              maxHeight: '260px',
              lineHeight: '1.4',
            }}
          >
            {JSON.stringify(snapshotData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};
