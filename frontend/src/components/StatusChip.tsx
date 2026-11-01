import React from 'react';
import {
  FileText,
  CheckCircle2,
  Lock,
  CheckCheck,
  AlertOctagon,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  HelpCircle,
} from 'lucide-react';
import type { ClaimStatus, VerificationStatus } from '../context/AppContext';

export interface StatusChipProps {
  status: ClaimStatus | VerificationStatus | string;
  type?: 'claim' | 'verification';
  size?: 'sm' | 'md' | 'lg';
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, type = 'claim', size = 'md' }) => {
  let chipClass = 'info';
  let Icon = FileText;

  switch (status) {
    case 'Registered':
      chipClass = 'info';
      Icon = Clock;
      break;
    case 'Acknowledged':
      chipClass = 'ok';
      Icon = CheckCircle2;
      break;
    case 'Pledged':
      chipClass = 'warn';
      Icon = Lock;
      break;
    case 'Settled':
      chipClass = 'ok';
      Icon = CheckCheck;
      break;
    case 'Defaulted':
    case 'Cancelled':
      chipClass = 'danger';
      Icon = AlertOctagon;
      break;
    // Verification statuses
    case 'Unverified':
      chipClass = 'warn';
      Icon = HelpCircle;
      break;
    case 'Asserted':
      chipClass = 'info';
      Icon = Clock;
      break;
    case 'Disputed':
      chipClass = 'warn';
      Icon = ShieldAlert;
      break;
    case 'Verified':
      chipClass = 'ok';
      Icon = ShieldCheck;
      break;
    case 'Rejected':
      chipClass = 'danger';
      Icon = ShieldX;
      break;
    default:
      chipClass = 'info';
      Icon = FileText;
  }

  return (
    <span 
      className={`status-chip ${chipClass}`} 
      title={`${type}: ${status}`}
      style={size === 'sm' ? { padding: '2px 6px', fontSize: '11px', gap: '3px' } : undefined}
    >
      <Icon size={size === 'sm' ? 11 : 12} strokeWidth={2} />
      <span>{status}</span>
    </span>
  );
};
