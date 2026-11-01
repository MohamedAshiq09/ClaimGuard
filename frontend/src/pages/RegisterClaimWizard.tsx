import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  UploadCloud, 
  FileCheck, 
  ShieldCheck, 
  Lock, 
  AlertCircle,
  FileSpreadsheet,
  Building,
  Calendar,
  Layers,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HashChip } from '../components/HashChip';
import { RuleChecklist } from '../components/RuleChecklist';

export const RegisterClaimWizard: React.FC = () => {
  const navigate = useNavigate();
  const { addClaim, addToast, currentProfile, role } = useApp();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-1045');
  const [buyerName, setBuyerName] = useState('National Retail Chain Corp');
  const [buyerAddress, setBuyerAddress] = useState('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty');
  const [faceValue, setFaceValue] = useState<number>(850000);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [dueDate, setDueDate] = useState('2026-12-25');
  const [maxAdvanceRateBps, setMaxAdvanceRateBps] = useState<number>(8000);
  const [jurisdiction, setJurisdiction] = useState('IN');
  const [requireVerified, setRequireVerified] = useState(true);

  // Document Upload State
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [docHash, setDocHash] = useState<string>('0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069');
  const [isHashing, setIsHashing] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSuccessHash, setTxSuccessHash] = useState<string | null>(null);

  // Calculate browser-side SHA-256
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadedFileSize(file.size);
    setIsHashing(true);

    try {
      const buffer = await file.arrayBuffer();
      const digestBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(digestBuffer));
      const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setDocHash(hashHex);
    } catch (err) {
      console.error('Failed to hash document', err);
    } finally {
      setIsHashing(false);
    }
  };

  const handleRegister = async () => {
    setIsSubmitting(true);

    addToast({
      type: 'pending',
      title: 'Broadcasting to Portaldot V3',
      message: `Registering invoice ${invoiceNumber} into pallet-contracts...`,
    });

    // Simulate real block inclusion delay
    setTimeout(() => {
      // Real-format Substrate 32-byte tx hash
      const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const fakeTxHash = `0x${randomBytes}`;

      const newId = addClaim({
        invoiceNumber,
        issuer: currentProfile.address,
        issuerName: currentProfile.name,
        buyer: buyerAddress,
        buyerName,
        faceValue,
        currency,
        dueDate,
        docHash,
        status: 'Registered',
        verification: 'Unverified',
        maxAdvanceRateBps,
        allowedJurisdiction: jurisdiction,
        requireVerified,
      });

      setTxSuccessHash(fakeTxHash);
      setIsSubmitting(false);

      addToast({
        type: 'success',
        title: 'Claim Registered on Ledger',
        message: `Claim #${newId} (${invoiceNumber}) successfully registered on Portaldot V3.`,
        txHash: fakeTxHash,
      });
    }, 1200);
  };

  const maxBorrow = Math.floor((faceValue * maxAdvanceRateBps) / 10000);
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header and Back Link */}
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
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--ink)' }}>
          Register New Receivable Claim
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink-2)' }}>
          Record an invoice asset with cryptographic document fingerprint and enforced advance rate limits.
        </p>
      </div>

      {/* 3-Step Progress Header */}
      <div 
        className="card" 
        style={{ 
          padding: '16px 24px', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--surface-2)' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{ 
              width: '28px', 
              height: '28px', 
              borderRadius: '50%', 
              backgroundColor: currentStep >= 1 ? 'var(--brand)' : 'var(--border)', 
              color: currentStep >= 1 ? '#fff' : 'var(--ink-3)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px'
            }}
          >
            1
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: currentStep >= 1 ? 'var(--ink)' : 'var(--ink-3)' }}>
              Commercial Terms
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Face value & buyer details</div>
          </div>
        </div>

        <div style={{ height: '1px', flex: '1', backgroundColor: 'var(--border)', margin: '0 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{ 
              width: '28px', 
              height: '28px', 
              borderRadius: '50%', 
              backgroundColor: currentStep >= 2 ? 'var(--brand)' : 'var(--border)', 
              color: currentStep >= 2 ? '#fff' : 'var(--ink-3)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px'
            }}
          >
            2
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: currentStep >= 2 ? 'var(--ink)' : 'var(--ink-3)' }}>
              Document Fingerprint
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Browser-side SHA-256</div>
          </div>
        </div>

        <div style={{ height: '1px', flex: '1', backgroundColor: 'var(--border)', margin: '0 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{ 
              width: '28px', 
              height: '28px', 
              borderRadius: '50%', 
              backgroundColor: currentStep >= 3 ? 'var(--brand)' : 'var(--border)', 
              color: currentStep >= 3 ? '#fff' : 'var(--ink-3)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px'
            }}
          >
            3
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: currentStep >= 3 ? 'var(--ink)' : 'var(--ink-3)' }}>
              Review & Sign
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Invariant checks & dispatch</div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      {txSuccessHash ? (
        <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
          <div 
            style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              backgroundColor: 'rgba(14, 159, 142, 0.1)', 
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 8px 0' }}>
            Claim Successfully Registered
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)', maxWidth: '480px', margin: '0 auto 20px auto' }}>
            Invoice {invoiceNumber} has been verified against the 7 on-chain rules and committed to the Portaldot V3 lien registry.
          </p>

          <div 
            style={{ 
              backgroundColor: 'var(--surface-2)', 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius-md)', 
              padding: '16px', 
              maxWidth: '540px', 
              margin: '0 auto 24px auto',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
              <span style={{ color: 'var(--ink-3)' }}>Transaction Hash</span>
              <HashChip hash={txSuccessHash} type="tx" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
              <span style={{ color: 'var(--ink-3)' }}>Assigned Issuer</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{currentProfile.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--ink-3)' }}>Maximum Financing Capacity</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
                {currencySymbol}{maxBorrow.toLocaleString()} ({(maxAdvanceRateBps / 100).toFixed(0)}%)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Link to="/app/claims" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Go to Claims Registry
            </Link>
            <button 
              type="button" 
              onClick={() => {
                setTxSuccessHash(null);
                setCurrentStep(1);
                setInvoiceNumber(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
              }}
              className="btn btn-secondary"
            >
              Register Another Invoice
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '28px' }}>
          {/* STEP 1: Commercial Terms */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
                Step 1: Invoice & Counterparty Details
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Invoice Reference ID
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="input-field"
                    placeholder="e.g. INV-2026-1045"
                    id="input-invoice-number"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px', display: 'block' }}>
                    Unique business identifier on invoices and purchase orders.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Due / Maturity Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="input-field"
                    id="input-due-date"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px', display: 'block' }}>
                    Rule 2: Maturity date must be in the future.
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Buyer (Corporate Debtor Name)
                  </label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="input-field"
                    placeholder="e.g. National Retail Chain Corp"
                    id="input-buyer-name"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Legal Jurisdiction
                  </label>
                  <select
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    className="input-field"
                    id="input-jurisdiction"
                  >
                    <option value="IN">IN (India - GST / TReDS)</option>
                    <option value="US">US (United States - UCC-1)</option>
                    <option value="UK">UK (United Kingdom)</option>
                    <option value="SG">SG (Singapore)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Buyer Substrate SS58 Address
                </label>
                <input
                  type="text"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  className="input-field"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                  placeholder="5..."
                  id="input-buyer-address"
                />
                <span style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px', display: 'block' }}>
                  The buyer can acknowledge goods receipt or dispute assertions directly with their key.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Invoice Face Value
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      value={faceValue}
                      onChange={(e) => setFaceValue(Math.max(1, Number(e.target.value)))}
                      className="input-field"
                      style={{ paddingRight: '70px', fontFamily: 'var(--font-mono)' }}
                      id="input-face-value"
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as 'INR' | 'USD')}
                      style={{
                        position: 'absolute',
                        right: '4px',
                        top: '4px',
                        bottom: '4px',
                        border: 'none',
                        backgroundColor: 'var(--surface-2)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0 8px',
                        fontWeight: 600,
                        fontSize: '12px',
                        color: 'var(--ink)',
                      }}
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px', display: 'block' }}>
                    Total commercial amount payable at maturity.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Max Advance Rate: {(maxAdvanceRateBps / 100).toFixed(0)}% ({currencySymbol}{maxBorrow.toLocaleString()})
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="10000"
                    step="500"
                    value={maxAdvanceRateBps}
                    onChange={(e) => setMaxAdvanceRateBps(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--brand)', height: '36px' }}
                    id="input-advance-rate-slider"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink-3)' }}>
                    <span>10% (Conservative)</span>
                    <span>80% (Standard)</span>
                    <span>100% (Full)</span>
                  </div>
                </div>
              </div>

              {/* Verified Only Checkbox */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '10px', 
                  padding: '12px', 
                  backgroundColor: 'var(--surface-2)', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border)' 
                }}
              >
                <input
                  type="checkbox"
                  id="chk-require-verified"
                  checked={requireVerified}
                  onChange={(e) => setRequireVerified(e.target.checked)}
                  style={{ marginTop: '2px', accentColor: 'var(--accent)' }}
                />
                <label htmlFor="chk-require-verified" style={{ fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' }}>
                  <span style={{ fontWeight: 600, display: 'block' }}>Enforce Rule 7 (Require Verified for Pledging)</span>
                  <span style={{ color: 'var(--ink-2)' }}>
                    When checked, financiers cannot pledge against this claim until an optimistic bond has been posted and the challenge window expires without dispute.
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  id="btn-next-step-2"
                >
                  <span>Next: Document Fingerprint</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Document Fingerprint */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
                Step 2: Cryptographic Document Fingerprint
              </h2>

              <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-2)' }}>
                Upload the invoice PDF or electronic tax bill to compute its 32-byte SHA-256 fingerprint right in your browser.
              </p>

              {/* Upload Zone */}
              <div 
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: 'var(--surface-2)',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                  id="file-upload-input"
                />

                <UploadCloud size={40} color="var(--accent)" style={{ margin: '0 auto 12px auto', display: 'block' }} />

                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                  {uploadedFileName ? uploadedFileName : 'Click or drag invoice document here'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
                  {uploadedFileSize 
                    ? `${(uploadedFileSize / 1024).toFixed(1)} KB • SHA-256 computed instantly in browser` 
                    : 'Supported: PDF, XML, JSON, PNG (up to 25MB)'}
                </div>
              </div>

              {/* Browser SHA-256 Digest Box */}
              <div 
                style={{ 
                  backgroundColor: 'var(--surface)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '16px' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                    SHA-256 Document Digest (Rule 1 & 4 Input)
                  </span>
                  {isHashing ? (
                    <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>Computing SHA-256...</span>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>✓ Ready for on-chain registry</span>
                  )}
                </div>

                <div style={{ backgroundColor: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <HashChip hash={docHash} type="hash" copyable={true} />
                </div>
              </div>

              {/* Privacy / Commercial Disclosure Box */}
              <div 
                style={{ 
                  padding: '14px', 
                  backgroundColor: 'rgba(14, 159, 142, 0.05)', 
                  border: '1px solid rgba(14, 159, 142, 0.25)', 
                  borderRadius: 'var(--radius-md)', 
                  display: 'flex', 
                  gap: '12px',
                  alignItems: 'flex-start'
                }}
              >
                <Lock size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12px', color: 'var(--ink)', lineHeight: '1.5' }}>
                  <strong style={{ color: 'var(--brand)', display: 'block', marginBottom: '2px' }}>
                    Zero Data Leakage Guarantee
                  </strong>
                  Your actual invoice document and proprietary commercial pricing never leave your computer. Only the 32-byte mathematical SHA-256 hash is submitted to the Portaldot blockchain, guaranteeing that counterparties cannot inspect your prices while ensuring absolute non-repudiation.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  id="btn-next-step-3"
                >
                  <span>Next: Review & Invariant Check</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Sign */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
                Step 3: Review Details & Invariant Validation
              </h2>

              <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-2)' }}>
                Verify that your receivable passes all core Portaldot invariants before dispatching the registration extrinsic.
              </p>

              {/* Summary Card */}
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '12px', 
                  backgroundColor: 'var(--surface-2)', 
                  padding: '16px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border)' 
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Invoice ID</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--brand)' }}>
                    {invoiceNumber}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Face Value</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                    {currencySymbol}{faceValue.toLocaleString()} ({currency})
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Financing Capacity Cap</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                    {currencySymbol}{maxBorrow.toLocaleString()} ({(maxAdvanceRateBps / 100).toFixed(0)}%)
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Maturity Date</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                    {dueDate}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Debtor (Buyer)</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                    {buyerName}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Jurisdiction</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                    {jurisdiction}
                  </span>
                </div>
              </div>

              {/* 7 Rules Pre-Flight Checklist */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
                  Smart Contract Pre-Flight Evaluation
                </label>
                <RuleChecklist
                  claim={{
                    faceValue,
                    dueDate,
                    maxAdvanceRateBps,
                    docHash,
                    totalPledged: 0,
                    status: 'Registered',
                    verification: 'Unverified',
                    requireVerified,
                  }}
                  attemptedPledgeAmount={0}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '180px', justifyContent: 'center' }}
                  id="btn-sign-and-register"
                >
                  {isSubmitting ? (
                    <span>Broadcasting Extrinsic...</span>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Sign & Register on Ledger</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
