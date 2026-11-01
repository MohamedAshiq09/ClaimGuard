import React from 'react';
import { 
  History, 
  ShieldAlert, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HashChip } from '../components/HashChip';

export const AuditFeedPage: React.FC = () => {
  const { violations } = useApp();

  const handleDownloadLog = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(violations, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `claimguard_violations_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--ink)' }}>
            Invariant Audit Feed
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink-2)' }}>
            Real-time immutable log of attempted double-pledges, invariant breaches, and transaction aborts.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadLog}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Download size={15} />
          <span>Export Audit Log (JSON)</span>
        </button>
      </div>

      {/* Top Banner / Explanation */}
      <div 
        style={{ 
          padding: '16px 20px', 
          backgroundColor: 'var(--surface-2)', 
          border: '1px solid var(--border)', 
          borderRadius: 'var(--radius-md)', 
          display: 'flex', 
          gap: '12px',
          alignItems: 'center'
        }}
      >
        <ShieldAlert size={20} color="var(--accent)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '13px', color: 'var(--ink)' }}>
          <strong>Zero Balance Alteration Guarantee:</strong> Every entry below represents an attempted state violation that was intercepted by ink! 5.1.1 rules before state mutation could occur. The original asset remains unencumbered.
        </div>
      </div>

      {/* Violations Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {violations.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--ink-3)' }}>
            No invariant violations recorded yet. All operations have conformed to the 7 core rules.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>Timestamp</th>
                  <th>Claim Reference</th>
                  <th>Interception Rule</th>
                  <th>Actor / Offender</th>
                  <th>Attempted Amount</th>
                  <th>Action / Reason</th>
                  <th style={{ width: '120px' }}>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {violations.map((v, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
                      {new Date(v.timestamp).toLocaleTimeString()}
                      <br />
                      <span style={{ fontSize: '10px' }}>{new Date(v.timestamp).toLocaleDateString()}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontSize: '13px' }}>
                        {v.invoiceNumber || `Claim #${v.claimId}`}
                      </span>
                    </td>
                    <td>
                      <span 
                        style={{ 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          color: 'var(--danger)', 
                          backgroundColor: 'rgba(217, 48, 37, 0.08)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        {v.ruleName}
                      </span>
                    </td>
                    <td>
                      <HashChip hash={v.actor} type="account" />
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>
                      ₹{v.attemptedAmount.toLocaleString()}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--ink-2)', maxWidth: '300px' }}>
                      {v.reason}
                    </td>
                    <td>
                      {v.txHash ? (
                        <HashChip hash={v.txHash} type="tx" />
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Pre-flight dryRun</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
