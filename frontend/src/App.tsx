import { useState } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Globe, 
  Activity, 
  FileText, 
  DollarSign, 
  Plus, 
  RefreshCw,
  Zap,
  TrendingUp,
  Cpu,
  Check
} from 'lucide-react';

interface Claim {
  id: string;
  invoiceNumber: string;
  supplier: string;
  buyer: string;
  faceValue: number;
  currency: string;
  totalPledged: number;
  maxAdvanceRateBps: number;
  status: 'Registered' | 'Acknowledged' | 'Pledged' | 'Settled';
  verification: 'Unverified' | 'Asserted' | 'Verified' | 'Rejected';
  requireVerified: boolean;
  dueDate: string;
  docHash: string;
  jurisdiction: string;
  liens: { id: number; lender: string; amount: number; timestamp: string; active: boolean }[];
}

interface Violation {
  id: string;
  timestamp: string;
  claimId: string;
  ruleName: string;
  actor: string;
  attemptedAmount: number;
  reason: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'claims' | 'simulator' | 'verification' | 'crosschain' | 'audits'>('claims');
  const [currentActor, setCurrentActor] = useState<'alice' | 'bob' | 'dave' | 'eve'>('alice');

  // Initial claims dataset matching Meena's story
  const [claims, setClaims] = useState<Claim[]>([
    {
      id: '1',
      invoiceNumber: 'INV-1042',
      supplier: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY (Meena Garments)',
      buyer: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty (Bharat Retail Ltd)',
      faceValue: 1000000,
      currency: 'INR',
      totalPledged: 800000,
      maxAdvanceRateBps: 8000, // 80%
      status: 'Pledged',
      verification: 'Verified',
      requireVerified: true,
      dueDate: '2026-11-28',
      docHash: '0x0707070707070707070707070707070707070707070707070707070707070707',
      jurisdiction: 'IN (India)',
      liens: [
        {
          id: 1,
          lender: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy (AlphaCredit)',
          amount: 800000,
          timestamp: '2026-10-29 17:35 UTC',
          active: true,
        }
      ]
    },
    {
      id: '2',
      invoiceNumber: 'INV-1043',
      supplier: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY (Meena Garments)',
      buyer: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty (Bharat Retail Ltd)',
      faceValue: 750000,
      currency: 'INR',
      totalPledged: 0,
      maxAdvanceRateBps: 7500, // 75%
      status: 'Acknowledged',
      verification: 'Verified',
      requireVerified: true,
      dueDate: '2026-12-15',
      docHash: '0x3a4b8c9d1e2f3a4b8c9d1e2f3a4b8c9d1e2f3a4b8c9d1e2f3a4b8c9d1e2f3a4b',
      jurisdiction: 'IN (India)',
      liens: []
    },
    {
      id: '3',
      invoiceNumber: 'INV-1044',
      supplier: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY (Meena Garments)',
      buyer: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty (Bharat Retail Ltd)',
      faceValue: 500000,
      currency: 'INR',
      totalPledged: 0,
      maxAdvanceRateBps: 8000,
      status: 'Registered',
      verification: 'Unverified',
      requireVerified: true,
      dueDate: '2026-12-20',
      docHash: '0x8899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677',
      jurisdiction: 'IN (India)',
      liens: []
    }
  ]);

  const [violations, setViolations] = useState<Violation[]>([
    {
      id: 'v-101',
      timestamp: '19:59:42 IST',
      claimId: 'INV-1042',
      ruleName: 'ExceedsAdvanceRate',
      actor: '5HGj1U... (Lender B)',
      attemptedAmount: 800000,
      reason: 'Attempted pledge exceeds max 80% advance rate. Asset already 100% encumbered.'
    },
    {
      id: 'v-100',
      timestamp: '19:59:41 IST',
      claimId: 'INV-1042',
      ruleName: 'NotVerified',
      actor: '5Grwva... (Issuer)',
      attemptedAmount: 500000,
      reason: 'Claim requires Verified status before pledge can be recorded.'
    }
  ]);

  // Simulator State
  const [selectedSimClaimId, setSelectedSimClaimId] = useState('1');
  const [simLoanAmount, setSimLoanAmount] = useState('800000');
  const [simLender, setSimLender] = useState('Lender B (Secondary Pool)');
  const [simResult, setSimResult] = useState<any>(null);

  // New Invoice Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newInvNum, setNewInvNum] = useState('');
  const [newFaceValue, setNewFaceValue] = useState('600000');
  const [newAdvanceRate, setNewAdvanceRate] = useState('80');

  // Trigger double pledge simulation
  const runSimulator = () => {
    const claim = claims.find(c => c.id === selectedSimClaimId);
    if (!claim) return;

    const attempted = Number(simLoanAmount);
    const maxAllowed = (claim.faceValue * claim.maxAdvanceRateBps) / 10000;
    const remaining = maxAllowed > claim.totalPledged ? maxAllowed - claim.totalPledged : 0;

    if (claim.status !== 'Acknowledged' && claim.status !== 'Pledged') {
      setSimResult({
        allowed: false,
        rule: 'BuyerAcknowledged',
        reason: 'Invoice has not been acknowledged by buyer on-chain.',
        remaining
      });
      return;
    }

    if (claim.requireVerified && claim.verification !== 'Verified') {
      setSimResult({
        allowed: false,
        rule: 'NotVerified',
        reason: 'Invoice must pass Bonded Verification before financing.',
        remaining
      });
      return;
    }

    if (attempted + claim.totalPledged > maxAllowed) {
      const violation: Violation = {
        id: `v-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        claimId: claim.invoiceNumber,
        ruleName: 'ExceedsAdvanceRate',
        actor: simLender,
        attemptedAmount: attempted,
        reason: `Exceeds max advance capacity of ₹${maxAllowed.toLocaleString()}. Remaining: ₹${remaining.toLocaleString()}.`
      };
      setViolations([violation, ...violations]);
      setSimResult({
        allowed: false,
        rule: 'ExceedsAdvanceRate',
        reason: `DOUBLE-PLEDGE BLOCKED: Attempt of ₹${attempted.toLocaleString()} exceeds remaining advance capacity of ₹${remaining.toLocaleString()}. Reverts on-chain!`,
        remaining
      });
    } else {
      setSimResult({
        allowed: true,
        rule: 'None',
        reason: `SAFE TO FUND: Invariant check passed. Capacity remaining after loan: ₹${(remaining - attempted).toLocaleString()}.`,
        remaining: remaining - attempted
      });
    }
  };

  // Quick Action Handlers
  const handleAcknowledge = (id: string) => {
    setClaims(claims.map(c => c.id === id ? { ...c, status: 'Acknowledged' } : c));
  };

  const handleVerify = (id: string) => {
    setClaims(claims.map(c => c.id === id ? { ...c, verification: 'Verified' } : c));
  };

  const handleRelease = (id: string) => {
    setClaims(claims.map(c => c.id === id ? { ...c, totalPledged: 0, status: 'Acknowledged', liens: [] } : c));
  };

  const handleSettle = (id: string) => {
    setClaims(claims.map(c => c.id === id ? { ...c, status: 'Settled' } : c));
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const faceVal = Number(newFaceValue);
    const newClaim: Claim = {
      id: String(claims.length + 1),
      invoiceNumber: newInvNum || `INV-104${claims.length + 2}`,
      supplier: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY (Meena Garments)',
      buyer: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty (Bharat Retail Ltd)',
      faceValue: faceVal,
      currency: 'INR',
      totalPledged: 0,
      maxAdvanceRateBps: Number(newAdvanceRate) * 100,
      status: 'Registered',
      verification: 'Unverified',
      requireVerified: true,
      dueDate: '2026-12-31',
      docHash: '0x' + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join(''),
      jurisdiction: 'IN (India)',
      liens: []
    };
    setClaims([...claims, newClaim]);
    setShowRegisterModal(false);
    setNewInvNum('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header className="glass-panel" style={{ margin: '16px 24px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' }}>
            <Shield size={24} color="#000" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="font-display" style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #FFF 0%, #A5F3FC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ClaimGuard
              </span>
              <span className="badge badge-cyan">PORTALDOT V3 TESTNET</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Compliance & Shared Lien State That Travels With The Asset</p>
          </div>
        </div>

        {/* Network & Active Actor Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Engine:</span>
            <span className="mono" style={{ color: '#FFF' }}>ink! 5.1.1 (pallet-contracts)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Persona:</span>
            <select 
              value={currentActor} 
              onChange={(e) => setCurrentActor(e.target.value as any)}
              style={{ background: 'var(--bg-surface)', color: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.82rem', outline: 'none' }}
            >
              <option value="alice">👩‍💼 Meena Garments (Supplier)</option>
              <option value="bob">🏢 Bharat Retail Ltd (Buyer)</option>
              <option value="dave">🏦 AlphaCredit (Lender A)</option>
              <option value="eve">🌐 CrossLend (Lender B - Secondary Pool)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main style={{ padding: '0 24px 32px 24px', flex: 1 }}>
        {/* Metric Cards Ribbon */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px', marginBottom: '24px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Invoiced</span>
              <DollarSign size={18} color="var(--cyan-bright)" />
            </div>
            <div className="font-display" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#FFF' }}>
              ₹{claims.reduce((acc, c) => acc + c.faceValue, 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={14} /> 3 Verified Invoices Active
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Liens Enforced</span>
              <Lock size={18} color="#34D399" />
            </div>
            <div className="font-display" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#FFF' }}>
              ₹{claims.reduce((acc, c) => acc + c.totalPledged, 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Single source of truth via shared LienManager
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: '#F87171', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attacks Intercepted</span>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} className="pulse-danger"></div>
            </div>
            <div className="font-display" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#F87171' }}>
              {violations.length} Blocked
            </div>
            <div style={{ fontSize: '0.75rem', color: '#F87171', marginTop: '6px' }}>
              ₹{(violations.reduce((acc, v) => acc + v.attemptedAmount, 0)).toLocaleString()} bad debt prevented
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Compliance</span>
              <Cpu size={18} color="var(--purple-accent)" />
            </div>
            <div className="font-display" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#A78BFA' }}>
              100% Fail-Closed
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              7 On-Chain Invariant Rules Guaranteed
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <button 
            className={`btn ${activeTab === 'claims' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('claims')}
          >
            <FileText size={16} /> Receivables Registry ({claims.length})
          </button>
          <button 
            className={`btn ${activeTab === 'simulator' ? 'btn-danger' : 'btn-outline'}`}
            onClick={() => setActiveTab('simulator')}
            style={activeTab === 'simulator' ? { boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)' } : {}}
          >
            <Zap size={16} /> Double-Pledge Defense Simulator
          </button>
          <button 
            className={`btn ${activeTab === 'verification' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('verification')}
          >
            <Shield size={16} /> Bonded Verification (Truth Layer)
          </button>
          <button 
            className={`btn ${activeTab === 'crosschain' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('crosschain')}
          >
            <Globe size={16} /> Cross-Chain Gateway (Lender B)
          </button>
          <button 
            className={`btn ${activeTab === 'audits' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('audits')}
          >
            <Activity size={16} /> Live Invariant Audit Feed ({violations.length})
          </button>
        </div>

        {/* TAB 1: CLAIMS REGISTRY */}
        {activeTab === 'claims' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF' }}>Tokenized Trade Receivables</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-time lien status, advance capacity, and cryptographic invoice hashes</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowRegisterModal(true)}>
                <Plus size={16} /> Register New Invoice
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
              {claims.map((claim) => {
                const maxAdvanceAllowed = (claim.faceValue * claim.maxAdvanceRateBps) / 10000;
                const capacityPct = Math.round((claim.totalPledged / maxAdvanceAllowed) * 100);

                return (
                  <div key={claim.id} className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF' }}>{claim.invoiceNumber}</span>
                          <span className="badge badge-cyan">{claim.jurisdiction}</span>
                        </div>
                        <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>ID: #{claim.id} | Due: {claim.dueDate}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span className={`badge ${
                          claim.status === 'Settled' ? 'badge-emerald' : 
                          claim.status === 'Pledged' ? 'badge-purple' : 
                          claim.status === 'Acknowledged' ? 'badge-cyan' : 'badge-amber'
                        }`}>
                          {claim.status}
                        </span>
                        <span className={`badge ${
                          claim.verification === 'Verified' ? 'badge-emerald' : 
                          claim.verification === 'Rejected' ? 'badge-rose' : 'badge-amber'
                        }`}>
                          {claim.verification}
                        </span>
                      </div>
                    </div>

                    {/* Financial Values */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Face Value</span>
                        <div className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF' }}>
                          ₹{claim.faceValue.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Max Advance Limit ({claim.maxAdvanceRateBps/100}%)</span>
                        <div className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--cyan-bright)' }}>
                          ₹{maxAdvanceAllowed.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar of Advance Capacity */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Pledged / Capacity Used</span>
                        <span className="mono" style={{ color: capacityPct >= 100 ? '#F87171' : '#FFF' }}>
                          ₹{claim.totalPledged.toLocaleString()} ({capacityPct}%)
                        </span>
                      </div>
                      <div className="progress-bar-bg">
                        <div 
                          className="progress-bar-fill" 
                          style={{ 
                            width: `${Math.min(capacityPct, 100)}%`, 
                            background: capacityPct >= 100 ? 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)' : 'linear-gradient(90deg, #06B6D4 0%, #10B981 100%)' 
                          }}
                        />
                      </div>
                    </div>

                    {/* Document Provenance Hash */}
                    <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.7rem' }}>
                      <span style={{ color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>Document Hash (Anti-Duplicate Guard):</span>
                      <span className="mono" style={{ color: 'var(--text-muted)', wordBreak: 'break-all' }}>{claim.docHash}</span>
                    </div>

                    {/* Action Buttons based on status */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                      {claim.status === 'Registered' && (
                        <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => handleAcknowledge(claim.id)}>
                          <CheckCircle2 size={14} color="#06B6D4" /> Buyer Acknowledge
                        </button>
                      )}
                      {claim.verification === 'Unverified' && (
                        <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => handleVerify(claim.id)}>
                          <Shield size={14} color="#10B981" /> Post Bond & Verify
                        </button>
                      )}
                      {claim.status === 'Pledged' && (
                        <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => handleRelease(claim.id)}>
                          <RefreshCw size={14} color="#F59E0B" /> Repay Loan & Release Lien
                        </button>
                      )}
                      {claim.status === 'Acknowledged' && claim.totalPledged === 0 && (
                        <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => handleSettle(claim.id)}>
                          <Check size={14} color="#10B981" /> Buyer Settle Invoice
                        </button>
                      )}
                      <button 
                        className="btn btn-outline btn-sm" 
                        onClick={() => {
                          setSelectedSimClaimId(claim.id);
                          setActiveTab('simulator');
                        }}
                      >
                        <Zap size={14} color="#EF4444" /> Test Attack
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: DOUBLE PLEDGE SIMULATOR */}
        {activeTab === 'simulator' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={20} color="#EF4444" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF' }}>Double-Pledge Attack Simulator</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Simulate fraudulent double-financing to test on-chain invariant enforcement</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Select Target Receivable:</label>
                  <select 
                    value={selectedSimClaimId} 
                    onChange={(e) => setSelectedSimClaimId(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-surface)', color: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px', fontSize: '0.9rem', outline: 'none' }}
                  >
                    {claims.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.invoiceNumber} — Face Value: ₹{c.faceValue.toLocaleString()} (Pledged: ₹{c.totalPledged.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Financing Amount to Attempt (₹):</label>
                  <input 
                    type="number" 
                    value={simLoanAmount}
                    onChange={(e) => setSimLoanAmount(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-surface)', color: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Target Lender / Attacker Persona:</label>
                  <input 
                    type="text" 
                    value={simLender}
                    onChange={(e) => setSimLender(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-surface)', color: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <button className="btn btn-danger" style={{ width: '100%', padding: '14px', marginTop: '8px' }} onClick={runSimulator}>
                  <Zap size={18} /> Execute Invariant Check & Pledge Extrinsic
                </button>
              </div>
            </div>

            {/* Simulation Results Display */}
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF', marginBottom: '16px' }}>On-Chain Invariant Engine Response</h3>

              {!simResult ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', textAlign: 'center' }}>
                  <Shield size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p>Select a receivable and run the simulation to inspect real-time contract execution results.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '16px', borderRadius: '12px', background: simResult.allowed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.12)', border: simResult.allowed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      {simResult.allowed ? <CheckCircle2 color="#10B981" size={24} /> : <AlertTriangle color="#EF4444" size={24} />}
                      <span className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, color: simResult.allowed ? '#10B981' : '#F87171' }}>
                        {simResult.allowed ? 'INVARIANT PASS: SAFE TO FUND' : `INVARIANT REJECTION: ${simResult.rule}`}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#FFF' }}>{simResult.reason}</p>
                  </div>

                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '8px' }}>Technical Audit Trail:</span>
                    <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                      ► Target Claim: #{selectedSimClaimId} ({claims.find(c => c.id === selectedSimClaimId)?.invoiceNumber})<br/>
                      ► Invariant Rule: rules::validate_advance_rate()<br/>
                      ► Substrate Pallet Call: contracts::call (pledge)<br/>
                      ► Result Dispatch: {simResult.allowed ? 'DispatchResult::Ok' : 'DispatchResult::Err(ExceedsAdvanceRate)'}<br/>
                      ► State Mutation: {simResult.allowed ? 'Lien recorded in LienManager' : 'REVERTED (Zero State Change)'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: BONDED VERIFICATION */}
        {activeTab === 'verification' && (
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#FFF' }}>Bonded Verification (Optimistic Truth Layer)</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Financial bonds prevent fake invoices. Challengers earn slashed bonds upon proving disputes.</p>
              </div>
              <span className="badge badge-purple">ECONOMIC FRAUD DETERRENCE</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
              <div style={{ padding: '18px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>STEP 1: ASSERTION</span>
                <h4 style={{ color: '#FFF', margin: '8px 0' }}>Post Validity Bond</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Supplier posts 5,000 tPOT bond asserting delivery of goods.</p>
              </div>
              <div style={{ padding: '18px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>STEP 2: CHALLENGE WINDOW</span>
                <h4 style={{ color: '#FFF', margin: '8px 0' }}>48-Hour Optimistic Window</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Buyer or verifier bot can challenge fake invoices by matching the bond.</p>
              </div>
              <div style={{ padding: '18px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>STEP 3: RESOLUTION</span>
                <h4 style={{ color: '#FFF', margin: '8px 0' }}>Slash or Finalize</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Challenger wins 100% bond if invoice is fraudulent; claim is marked Rejected.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CROSS-CHAIN GATEWAY */}
        {activeTab === 'crosschain' && (
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#FFF' }}>Cross-Chain Signed Snapshot Gateway (Lender B)</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Cryptographic state receipts carry lien encumbrances to secondary chains and DeFi pools.</p>
              </div>
              <span className="badge badge-cyan">CROSS-CHAIN INVARIANT SYNC</span>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '12px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ color: 'var(--cyan-bright)', marginBottom: '8px' }}>// Exported Relayer Attestation Receipt for Claim #1:</div>
              {`{
  "claimId": "1",
  "status": "Pledged",
  "verification": "Verified",
  "faceValue": "1000000",
  "totalPledged": "800000",
  "maxAdvanceRateBps": 8000,
  "nonce": "5",
  "relayerSigner": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "snapshotHash": "0xf44f22130e733971c8c813c9d3c32a75a1aa853024c53ddcb423d56e759e2557",
  "signature": "0x62f763b6708a502347efe55886f84d...c064de07ccafc58a"
}`}
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOG FEED */}
        {activeTab === 'audits' && (
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#FFF', marginBottom: '16px' }}>Real-Time Invariant Violation Audit Feed</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Every double-pledge and unauthorized mutation attempt intercepted by ClaimGuard is recorded here.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {violations.map((v) => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }}></div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="mono" style={{ fontWeight: 700, color: '#FFF' }}>{v.claimId}</span>
                        <span className="badge badge-rose">{v.ruleName}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>{v.reason}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F87171' }}>₹{v.attemptedAmount.toLocaleString()}</span>
                    <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>{v.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Register Invoice Modal */}
      {showRegisterModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: 'var(--bg-surface)' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#FFF', marginBottom: '16px' }}>Register Trade Receivable</h3>
            <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Invoice Identifier:</label>
                <input 
                  type="text" 
                  placeholder="e.g. INV-1045"
                  value={newInvNum} 
                  onChange={(e) => setNewInvNum(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-app)', color: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Invoice Face Value (₹):</label>
                <input 
                  type="number" 
                  value={newFaceValue} 
                  onChange={(e) => setNewFaceValue(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-app)', color: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Max Advance Rate (%):</label>
                <input 
                  type="number" 
                  value={newAdvanceRate} 
                  onChange={(e) => setNewAdvanceRate(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-app)', color: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Submit to Blockchain</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowRegisterModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
