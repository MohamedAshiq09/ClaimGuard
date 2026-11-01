import React, { useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  Radio,
  History,
  PlayCircle,
  Scale,
  Sun,
  Moon,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useApp, ROLE_PROFILES, type Role } from '../context/AppContext';
import { TxToastContainer } from './TxToast';
import { HashChip } from './HashChip';

export const AppShell: React.FC = () => {
  const { role, setRole, currentProfile, theme, toggleTheme, contractAddress } = useApp();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: '/app', label: 'Overview', icon: LayoutDashboard },
    { to: '/app/claims', label: 'Claims Registry', icon: FileSpreadsheet },
    { to: '/app/lender', label: 'Lender Desk', icon: Building2 },
    { to: '/app/verification', label: 'Verification Center', icon: ShieldCheck },
    { to: '/app/snapshots', label: 'Snapshot Inspector', icon: Radio },
    { to: '/app/audit', label: 'Audit Feed', icon: History },
    { to: '/app/demo', label: 'Guided Demo', icon: PlayCircle },
    { to: '/trust', label: 'Trust Model', icon: Scale },
  ];

  return (
    <div className="app-container">
      {/* Sidebar (Desktop 240px, Collapsible) */}
      <aside
        className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Logo & App Brand */}
          <div
            style={{
              height: '60px',
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <Link
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
                color: 'var(--brand)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--brand)',
                  color: 'var(--brand-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                }}
              >
                CG
              </div>
              <div>
                <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
                  ClaimGuard
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    color: 'var(--accent)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Portaldot V3
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'none',
                color: 'var(--ink-2)',
              }}
              className="mobile-close-btn"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive =
                item.to === '/app'
                  ? location.pathname === '/app'
                  : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    color: isActive ? 'var(--brand)' : 'var(--ink-2)',
                    backgroundColor: isActive ? 'var(--surface-2)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    transition: 'all 0.15s ease-out',
                  }}
                >
                  <Icon size={16} strokeWidth={isActive ? 2 : 1.5} color={isActive ? 'var(--accent)' : 'var(--ink-3)'} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Contract Address & Faucet Note */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>
            Core Contract
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HashChip hash={contractAddress} type="address" chars={6} />
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--ink-3)' }}>
            Pallet-Contracts WASM (ink! 5.1.1)
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink)',
                display: 'none',
              }}
              className="mobile-open-btn"
            >
              <Menu size={22} />
            </button>

            {/* Network Badge */}
            <div className="network-badge">
              <span className="network-dot" />
              <span>Portaldot V3 Testnet</span>
              <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>#3002</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Role Switcher */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setRoleMenuOpen((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '10px', color: 'var(--ink-3)', display: 'block', textTransform: 'uppercase' }}>
                    Active Role
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--brand)' }}>
                    {currentProfile.label}
                  </span>
                </div>
                <ChevronDown size={14} color="var(--ink-3)" />
              </button>

              {roleMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    width: '280px',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-popover)',
                    padding: '8px',
                    zIndex: 100,
                  }}
                >
                  <div style={{ padding: '6px 8px 10px 8px', borderBottom: '1px solid var(--border)', fontSize: '11px', color: 'var(--ink-3)' }}>
                    Switch signer role to test end-to-end demo flows as different participants:
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
                    {(Object.keys(ROLE_PROFILES) as Role[]).map(rKey => {
                      const p = ROLE_PROFILES[rKey];
                      const isSelected = rKey === role;

                      return (
                        <button
                          key={rKey}
                          type="button"
                          onClick={() => {
                            setRole(rKey);
                            setRoleMenuOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: isSelected ? 'var(--surface-2)' : 'transparent',
                            border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? 'var(--accent)' : 'var(--ink)' }}>
                            {p.label}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '2px' }}>
                            {p.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle (Light / Dark) */}
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '8px',
                cursor: 'pointer',
                color: 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--surface-2)',
              }}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Theme`}
            >
              {theme === 'light' ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="content-body">
          <Outlet />
        </main>
      </div>

      {/* Global Toast Container */}
      <TxToastContainer />
    </div>
  );
};
