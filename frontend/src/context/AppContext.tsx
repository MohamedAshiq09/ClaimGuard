import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'issuer' | 'buyer' | 'lender' | 'challenger' | 'resolver';

export interface RoleProfile {
  id: Role;
  label: string;
  name: string;
  address: string;
  description: string;
}

export const ROLE_PROFILES: Record<Role, RoleProfile> = {
  issuer: {
    id: 'issuer',
    label: 'Issuer (Supplier)',
    name: 'Meena (Tiruppur Garments)',
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    description: 'Registers receivables, asserts validity with bond, requests advances, settles claims.',
  },
  buyer: {
    id: 'buyer',
    label: 'Buyer (Debtor)',
    name: 'National Retail Chain Corp',
    address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    description: 'Acknowledges goods received & payment liability; can challenge fabricated invoices.',
  },
  lender: {
    id: 'lender',
    label: 'Lender (Financier)',
    name: 'Lender A (Trade Credit Fund)',
    address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
    description: 'Checks invariants before financing, executes pledges, releases liens upon repayment.',
  },
  challenger: {
    id: 'challenger',
    label: 'Challenger (Auditor)',
    name: 'Independent Auditor / Buyer',
    address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
    description: 'Posts counter-bonds to challenge unverified or forged claims during the challenge window.',
  },
  resolver: {
    id: 'resolver',
    label: 'Resolver (Admin)',
    name: 'Portaldot Governance Resolver',
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    description: 'Rules on disputed claims, slashes fraudulent asserter/challenger bonds with 90/10 split.',
  },
};

export type ClaimStatus = 'Registered' | 'Acknowledged' | 'Pledged' | 'Settled' | 'Defaulted' | 'Cancelled';
export type VerificationStatus = 'Unverified' | 'Asserted' | 'Disputed' | 'Verified' | 'Rejected';

export interface ClaimItem {
  id: number;
  invoiceNumber: string;
  issuer: string;
  issuerName: string;
  buyer: string;
  buyerName: string;
  faceValue: number;
  currency: string;
  dueDate: string;
  docHash: string;
  status: ClaimStatus;
  verification: VerificationStatus;
  maxAdvanceRateBps: number;
  allowedJurisdiction: string;
  totalPledged: number;
  requireVerified: boolean;
  registeredAt: string;
  activeLienCount: number;
  challengeDeadline?: number;
  asserterBond?: number;
}

export interface ViolationEntry {
  timestamp: number;
  claimId: number;
  invoiceNumber?: string;
  ruleName: string;
  actor: string;
  attemptedAmount: number;
  reason: string;
  txHash?: string | null;
}

export interface ToastMessage {
  id: string;
  type: 'pending' | 'success' | 'danger' | 'info';
  title: string;
  message: string;
  txHash?: string;
}

interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;
  currentProfile: RoleProfile;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  claims: ClaimItem[];
  addClaim: (claim: Omit<ClaimItem, 'id' | 'registeredAt' | 'totalPledged' | 'activeLienCount'>) => number;
  updateClaim: (id: number, updates: Partial<ClaimItem>) => void;
  acknowledgeClaim: (id: number) => void;
  pledgeClaim: (id: number, lender: string, amount: number) => { success: boolean; error?: string; txHash?: string };
  violations: ViolationEntry[];
  recordViolation: (v: Omit<ViolationEntry, 'timestamp'>) => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  contractAddress: string;
}

const INITIAL_CLAIMS: ClaimItem[] = [
  {
    id: 1,
    invoiceNumber: 'INV-2026-1042',
    issuer: ROLE_PROFILES.issuer.address,
    issuerName: 'Meena (Tiruppur Garments)',
    buyer: ROLE_PROFILES.buyer.address,
    buyerName: 'National Retail Chain Corp',
    faceValue: 1_000_000,
    currency: 'INR',
    dueDate: '2026-12-15',
    docHash: '0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    status: 'Pledged',
    verification: 'Verified',
    maxAdvanceRateBps: 8000, // 80% = max 800,000
    allowedJurisdiction: 'IN',
    totalPledged: 800_000,
    requireVerified: true,
    registeredAt: '2026-10-31 10:15 UTC',
    activeLienCount: 1,
  },
  {
    id: 2,
    invoiceNumber: 'INV-2026-1043',
    issuer: ROLE_PROFILES.issuer.address,
    issuerName: 'Meena (Tiruppur Garments)',
    buyer: ROLE_PROFILES.buyer.address,
    buyerName: 'National Retail Chain Corp',
    faceValue: 650_000,
    currency: 'INR',
    dueDate: '2026-11-28',
    docHash: '0x4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
    status: 'Acknowledged',
    verification: 'Asserted',
    maxAdvanceRateBps: 8000,
    allowedJurisdiction: 'IN',
    totalPledged: 0,
    requireVerified: true,
    registeredAt: '2026-11-01 08:30 UTC',
    activeLienCount: 0,
    challengeDeadline: Date.now() + 86400000,
    asserterBond: 2500,
  },
  {
    id: 3,
    invoiceNumber: 'INV-2026-1044',
    issuer: ROLE_PROFILES.issuer.address,
    issuerName: 'Meena (Tiruppur Garments)',
    buyer: '5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM',
    buyerName: 'Global Apparel Importers Ltd',
    faceValue: 420_000,
    currency: 'USD',
    dueDate: '2026-12-01',
    docHash: '0x2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    status: 'Registered',
    verification: 'Unverified',
    maxAdvanceRateBps: 7500,
    allowedJurisdiction: 'US',
    totalPledged: 0,
    requireVerified: false,
    registeredAt: '2026-11-01 14:00 UTC',
    activeLienCount: 0,
  },
];

const INITIAL_VIOLATIONS: ViolationEntry[] = [
  {
    timestamp: Date.now() - 3600000,
    claimId: 1,
    invoiceNumber: 'INV-2026-1042',
    ruleName: 'ExceedsAdvanceRate',
    actor: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
    attemptedAmount: 800_000,
    reason: 'Blocked: ExceedsAdvanceRate. Only 0 of 800,000 capacity remains.',
    txHash: '0x8f2d5a7b1c4e9f3a6d0b2e8c5a7f1e9d3b5c7a9f2e4b6d8a0c2e4f6a8b0d2e4f',
  },
];

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>('issuer');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [claims, setClaims] = useState<ClaimItem[]>(() => {
    const saved = localStorage.getItem('claimguard_claims');
    return saved ? JSON.parse(saved) : INITIAL_CLAIMS;
  });
  const [violations, setViolations] = useState<ViolationEntry[]>(() => {
    const saved = localStorage.getItem('claimguard_violations');
    return saved ? JSON.parse(saved) : INITIAL_VIOLATIONS;
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const contractAddress = '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('claimguard_claims', JSON.stringify(claims));
  }, [claims]);

  useEffect(() => {
    localStorage.setItem('claimguard_violations', JSON.stringify(violations));
  }, [violations]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addClaim = (newClaimData: Omit<ClaimItem, 'id' | 'registeredAt' | 'totalPledged' | 'activeLienCount'>): number => {
    const nextId = claims.length > 0 ? Math.max(...claims.map(c => c.id)) + 1 : 1;
    const fullClaim: ClaimItem = {
      ...newClaimData,
      id: nextId,
      registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 16) + ' UTC',
      totalPledged: 0,
      activeLienCount: 0,
    };
    setClaims(prev => [fullClaim, ...prev]);
    addToast({
      type: 'success',
      title: 'Claim Registered',
      message: `${fullClaim.invoiceNumber} recorded on Portaldot V3 with doc hash fingerprint.`,
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    });
    return nextId;
  };

  const updateClaim = (id: number, updates: Partial<ClaimItem>) => {
    setClaims(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
  };

  const acknowledgeClaim = (id: number) => {
    updateClaim(id, { status: 'Acknowledged' });
    addToast({
      type: 'success',
      title: 'Invoice Acknowledged',
      message: `Buyer accepted liability on-chain for Claim #${id}. BuyerAcknowledged rule satisfied.`,
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    });
  };

  const recordViolation = (v: Omit<ViolationEntry, 'timestamp'>) => {
    const entry: ViolationEntry = {
      ...v,
      timestamp: Date.now(),
    };
    setViolations(prev => [entry, ...prev]);
  };

  const pledgeClaim = (id: number, lender: string, amount: number) => {
    const claim = claims.find(c => c.id === id);
    if (!claim) return { success: false, error: 'Claim not found' };

    // Invariant checks
    if (claim.status === 'Registered') {
      const reason = 'Buyer has not acknowledged invoice yet (Rule 2: BuyerAcknowledged).';
      recordViolation({
        claimId: id,
        invoiceNumber: claim.invoiceNumber,
        ruleName: 'BuyerNotAcknowledged',
        actor: lender,
        attemptedAmount: amount,
        reason,
      });
      return { success: false, error: reason };
    }

    if (claim.requireVerified && claim.verification !== 'Verified') {
      const reason = `Claim is not verified (Rule 7: VerifiedOnly). Current status: ${claim.verification}.`;
      recordViolation({
        claimId: id,
        invoiceNumber: claim.invoiceNumber,
        ruleName: 'NotVerified',
        actor: lender,
        attemptedAmount: amount,
        reason,
      });
      return { success: false, error: reason };
    }

    const maxAllowed = (claim.faceValue * claim.maxAdvanceRateBps) / 10000;
    const newTotal = claim.totalPledged + amount;
    if (newTotal > maxAllowed) {
      const remaining = Math.max(0, maxAllowed - claim.totalPledged);
      const reason = `Blocked: ExceedsAdvanceRate. Only ${remaining.toLocaleString()} of ${maxAllowed.toLocaleString()} capacity remains.`;
      const failedTxHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      recordViolation({
        claimId: id,
        invoiceNumber: claim.invoiceNumber,
        ruleName: 'ExceedsAdvanceRate',
        actor: lender,
        attemptedAmount: amount,
        reason,
        txHash: failedTxHash,
      });
      return { success: false, error: reason, txHash: failedTxHash };
    }

    const newTxHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    updateClaim(id, {
      totalPledged: newTotal,
      status: 'Pledged',
      activeLienCount: claim.activeLienCount + 1,
    });
    addToast({
      type: 'success',
      title: 'Lien Recorded On-Chain',
      message: `Pledge of ${amount.toLocaleString()} ${claim.currency} executed successfully.`,
      txHash: newTxHash,
    });
    return { success: true, txHash: newTxHash };
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        currentProfile: ROLE_PROFILES[role],
        theme,
        toggleTheme,
        claims,
        addClaim,
        updateClaim,
        acknowledgeClaim,
        pledgeClaim,
        violations,
        recordViolation,
        toasts,
        addToast,
        removeToast,
        contractAddress,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
