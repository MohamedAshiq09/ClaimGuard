import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

export interface HashChipProps {
  hash: string;
  type?: 'address' | 'account' | 'tx' | 'hash';
  chars?: number;
  copyable?: boolean;
}

export const HashChip: React.FC<HashChipProps> = ({ hash, type = 'hash', chars = 6, copyable = true }) => {
  const [copied, setCopied] = useState(false);

  if (!hash) return <span style={{ color: 'var(--ink-3)' }}>—</span>;

  const truncated =
    hash.length > chars * 2 + 3
      ? `${hash.substring(0, chars + 2)}...${hash.substring(hash.length - chars)}`
      : hash;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerUrl =
    type === 'tx'
      ? `https://node-console.portaldot.dev/#/explorer/query/${hash}`
      : type === 'address'
      ? `https://node-console.portaldot.dev/#/accounts/${hash}`
      : `https://node-console.portaldot.dev/#/explorer/query/${hash}`;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '2px 6px',
        fontSize: '12px',
        color: 'var(--ink)',
      }}
      className="font-mono tabular-nums"
      title={hash}
    >
      <span>{truncated}</span>

      <button
        type="button"
        onClick={handleCopy}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          color: copied ? 'var(--ok)' : 'var(--ink-3)',
          display: 'flex',
          alignItems: 'center',
        }}
        title={copied ? 'Copied!' : 'Copy to clipboard'}
      >
        {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={1.5} />}
      </button>

      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: 'var(--ink-3)',
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
          padding: '2px',
        }}
        title="View on Portaldot Explorer"
        onClick={e => e.stopPropagation()}
      >
        <ExternalLink size={12} strokeWidth={1.5} />
      </a>
    </span>
  );
};
