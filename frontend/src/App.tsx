import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { LandingPage } from './pages/LandingPage';
import { OverviewPage } from './pages/OverviewPage';
import { ClaimsListPage } from './pages/ClaimsListPage';
import { RegisterClaimWizard } from './pages/RegisterClaimWizard';
import { ClaimDetailPage } from './pages/ClaimDetailPage';
import { LenderDeskPage } from './pages/LenderDeskPage';
import { VerificationCenterPage } from './pages/VerificationCenterPage';
import { SnapshotInspectorPage } from './pages/SnapshotInspectorPage';
import { AuditFeedPage } from './pages/AuditFeedPage';
import { GuidedDemoPage } from './pages/GuidedDemoPage';
import { TrustModelPage } from './pages/TrustModelPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Trust Model Explainer */}
          <Route path="/trust" element={<TrustModelPage />} />

          {/* Authenticated / Protected App Shell */}
          <Route path="/app" element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="claims" element={<ClaimsListPage />} />
            <Route path="claims/new" element={<RegisterClaimWizard />} />
            <Route path="claims/:id" element={<ClaimDetailPage />} />
            <Route path="lender" element={<LenderDeskPage />} />
            <Route path="verification" element={<VerificationCenterPage />} />
            <Route path="snapshots" element={<SnapshotInspectorPage />} />
            <Route path="audit" element={<AuditFeedPage />} />
            <Route path="demo" element={<GuidedDemoPage />} />
          </Route>

          {/* Fallback to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
