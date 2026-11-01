import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  ExternalLink, 
  ArrowRight,
  ShieldAlert,
  Building,
  Calendar,
  Layers
} from 'lucide-react';
import { useApp, type ClaimItem } from '../context/AppContext';
import { StatusChip } from '../components/StatusChip';
import { AdvanceMeter } from '../components/AdvanceMeter';
import { HashChip } from '../components/HashChip';

export const ClaimsListPage: React.FC = () => {
  const { claims, role, currentProfile } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine'>('all');

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      // Search match
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesInv = claim.invoiceNumber.toLowerCase().includes(q);
        const matchesBuyer = claim.buyerName.toLowerCase().includes(q) || claim.buyer.toLowerCase().includes(q);
        const matchesIssuer = claim.issuerName.toLowerCase().includes(q) || claim.issuer.toLowerCase().includes(q);
        if (!matchesInv && !matchesBuyer && !matchesIssuer) return false;
      }

      // Status match
      if (statusFilter !== 'all' && claim.status !== statusFilter) {
        return false;
      }

      // Verification match
      if (verificationFilter !== 'all' && claim.verification !== verificationFilter) {
        return false;
      }

      // Scope match
      if (scopeFilter === 'mine') {
        if (role === 'issuer') {
          if (claim.issuer !== currentProfile.address) return false;
        } else if (role === 'buyer') {
          if (claim.buyer !== currentProfile.address) return false;
        }
      }

      return true;
    });
  }, [claims, search, statusFilter, verificationFilter, scopeFilter, role, currentProfile.address]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner / Actions */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px' 
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--ink)' }}>
            Claims Registry
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink-2)' }}>
            Single source of truth for verified trade invoices, lien commitments, and on-chain compliance rules.
          </p>
        </div>

        <Link
          to="/app/claims/new"
          className="btn btn-primary"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          id="btn-register-claim"
        >
          <Plus size={16} />
          <span>Register Claim</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div 
        className="card"
        style={{ 
          padding: '16px 20px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px' 
        }}
      >
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            gap: '12px', 
            flexWrap: 'wrap' 
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '220px' }}>
            <Search 
              size={16} 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} 
            />
            <input
              type="text"
              placeholder="Search invoice number, buyer, or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '36px', width: '100%' }}
              id="search-claims-input"
            />
          </div>

          {/* Scope Toggle (Mine vs All) */}
          <div style={{ display: 'flex', backgroundColor: 'var(--surface-2)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setScopeFilter('all')}
              style={{
                border: 'none',
                background: scopeFilter === 'all' ? 'var(--surface)' : 'transparent',
                color: scopeFilter === 'all' ? 'var(--brand)' : 'var(--ink-2)',
                fontWeight: scopeFilter === 'all' ? 600 : 400,
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                boxShadow: scopeFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              All Claims
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('mine')}
              style={{
                border: 'none',
                background: scopeFilter === 'mine' ? 'var(--surface)' : 'transparent',
                color: scopeFilter === 'mine' ? 'var(--brand)' : 'var(--ink-2)',
                fontWeight: scopeFilter === 'mine' ? 600 : 400,
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                boxShadow: scopeFilter === 'mine' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              Related to {currentProfile.label.split(' ')[0]}
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--ink-3)' }}>
            <Filter size={14} />
            <span>Filter by:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
            id="filter-status-select"
          >
            <option value="all">All Statuses</option>
            <option value="Registered">Registered</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Pledged">Pledged</option>
            <option value="Settled">Settled</option>
            <option value="Defaulted">Defaulted</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="input-field"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
            id="filter-verification-select"
          >
            <option value="all">All Verifications</option>
            <option value="Unverified">Unverified</option>
            <option value="Asserted">Asserted</option>
            <option value="Verified">Verified</option>
            <option value="Disputed">Disputed</option>
            <option value="Rejected">Rejected</option>
          </select>

          {(search || statusFilter !== 'all' || verificationFilter !== 'all' || scopeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setVerificationFilter('all');
                setScopeFilter('all');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px'
              }}
            >
              Reset filters
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            Showing {filteredClaims.length} of {claims.length} entries
          </div>
        </div>
      </div>

      {/* Claims Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredClaims.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <FileText size={40} color="var(--ink-3)" style={{ margin: '0 auto 16px auto', display: 'block', opacity: 0.5 }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 8px 0' }}>
              No claims match your current filters
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-2)', margin: '0 0 20px 0', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
              Try adjusting your search criteria, switching your active role, or register a new receivable claim.
            </p>
            <Link to="/app/claims/new" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              <Plus size={15} style={{ marginRight: '6px' }} />
              Register New Claim
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>Invoice ID</th>
                  <th>Buyer & Jurisdiction</th>
                  <th>Face Value</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th style={{ width: '220px' }}>Lien Capacity</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim) => {
                  const maxAllowed = Math.floor((claim.faceValue * claim.maxAdvanceRateBps) / 10000);
                  const isCurInr = claim.currency === 'INR';
                  const symbol = isCurInr ? '₹' : '$';

                  return (
                    <tr key={claim.id} style={{ transition: 'background-color 0.15s ease' }}>
                      {/* Invoice ID and Date */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--brand)', fontSize: '13px' }}>
                            {claim.invoiceNumber}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                            Due {claim.dueDate}
                          </span>
                        </div>
                      </td>

                      {/* Buyer info */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
                            {claim.buyerName}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span 
                              style={{ 
                                fontSize: '10px', 
                                padding: '1px 5px', 
                                backgroundColor: 'var(--surface-2)', 
                                border: '1px solid var(--border)', 
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--ink-2)',
                                fontWeight: 600
                              }}
                            >
                              {claim.allowedJurisdiction}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                              {claim.buyer.slice(0, 6)}...{claim.buyer.slice(-4)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Face value */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
                            {symbol}{claim.faceValue.toLocaleString()}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                            {claim.currency} • Max {(claim.maxAdvanceRateBps / 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <StatusChip status={claim.status} size="sm" />
                      </td>

                      {/* Verification */}
                      <td>
                        <StatusChip status={claim.verification} size="sm" />
                      </td>

                      {/* Advance capacity meter */}
                      <td>
                        <div style={{ paddingRight: '12px' }}>
                          <AdvanceMeter
                            faceValue={claim.faceValue}
                            totalPledged={claim.totalPledged}
                            maxAdvanceRateBps={claim.maxAdvanceRateBps}
                            currency={claim.currency}
                            showFigures={false}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                            <span style={{ color: 'var(--ink-2)' }}>
                              {symbol}{claim.totalPledged.toLocaleString()}
                            </span>
                            <span style={{ color: 'var(--ink-3)' }}>
                              cap {symbol}{maxAllowed.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          to={`/app/claims/${claim.id}`}
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 10px',
                            fontSize: '12px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          id={`view-claim-${claim.id}`}
                        >
                          <span>Manage</span>
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Registry Footnote / On-Chain Invariant Assurance */}
      <div 
        style={{ 
          padding: '12px 16px', 
          backgroundColor: 'var(--surface-2)', 
          border: '1px solid var(--border)', 
          borderRadius: 'var(--radius-md)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--ink-2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={15} color="var(--accent)" />
          <span>
            Portaldot ink! 5.1.1 contract enforces all 7 rules atomic at state level. Pledges exceeding advance caps or unverified invoices will revert instantly.
          </span>
        </div>
        <Link to="/trust" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>
          View 7 Core Rules &rarr;
        </Link>
      </div>
    </div>
  );
};
