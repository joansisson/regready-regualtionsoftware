// App.tsx (Modified for Local Pro)
import { useEffect, useState } from "react";
import { Route, Switch, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Activation from "@/pages/activation";
import { NewPolicyModalProvider } from "@/components/policy/new-policy-modal";
import PageZero from "@/pages/page-zero";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import SetupWizard from "@/pages/setup-wizard";
import WorkspaceSetup from "@/pages/workspace-setup";
import AuditReports from "@/pages/audit-reports";
import ComplianceFrameworks from "@/pages/compliance-frameworks";
import DocumentLibrary from "@/pages/document-library";
import PolicyDetail from "@/pages/policy-detail";
import Settings from "@/pages/settings";
import Notifications from "@/pages/notifications";
import PlaceholderPage from "@/pages/placeholder-page";
import TrustCenter from "@/pages/trust-center";
import NotFound from "@/pages/not-found";
import PolicyManagement from "@/pages/policy-management";
import RiskAssessment from "@/pages/risk-assessment";
import VendorManagement from "@/pages/vendor-management";
import SmokeTestPage from "@/pages/smoke";
import Sidebar from "@/components/layout/sidebar";
import {
  getSessionUser,
  getStoredActivationStatus,
  getStoredGeminiKey,
  getStoredActivationProfile,
  getStoredWorkspaceProfile,
  isWorkspaceProfileComplete,
  setSessionUser,
  setStoredActivationProfile,
  setStoredActivationStatus,
  setStoredGeminiKey,
  setStoredLLMProvider,
  clearSessionUser,
  type LocalUser,
} from "@/lib/auth";

function MainAppLayout() {
  return (
    <NewPolicyModalProvider>
      <div className="flex h-screen overflow-hidden bg-neutral-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Switch>
            {/* Dashboard nested routes (sidebar drives these) */}
            {/* Support both /dashboard and /dashboard/ */}
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/dashboard/" component={Dashboard} />
            <Route path="/dashboard/overview" component={Dashboard} />
            <Route path="/dashboard/policies" component={PolicyManagement} />
            <Route path="/dashboard/frameworks" component={ComplianceFrameworks} />
            <Route path="/dashboard/risk" component={RiskAssessment} />
            <Route path="/dashboard/vendors" component={VendorManagement} />
            <Route path="/dashboard/reports" component={AuditReports} />
            <Route path="/dashboard/documents" component={DocumentLibrary} />
            <Route path="/dashboard/settings" component={Settings} />

            {/* Keep legacy routes so existing deep links don't crash */}
            <Route path="/compliance-frameworks/:id/checklist">
              <PlaceholderPage
                title="Framework Checklist"
                description="Checklist views are not implemented yet."
                actionLabel="Back to Frameworks"
                actionHref="/compliance-frameworks"
              />
            </Route>
            <Route path="/compliance-frameworks/:id">
              <PlaceholderPage
                title="Framework Details"
                description="Detailed framework views are not implemented yet."
                actionLabel="Back to Frameworks"
                actionHref="/compliance-frameworks"
              />
            </Route>
            <Route path="/compliance-frameworks" component={ComplianceFrameworks} />
            <Route path="/audit-reports/:id">
              <PlaceholderPage
                title="Audit Report Details"
                description="Audit report detail pages are not implemented yet."
                actionLabel="Back to Reports"
                actionHref="/audit-reports"
              />
            </Route>
            <Route path="/audit-reports" component={AuditReports} />
            <Route path="/policies/:id/edit">
              <PlaceholderPage title="Edit Policy" description="Policy editing is not implemented yet." />
            </Route>
            <Route path="/policies/:id" component={PolicyDetail} />
            <Route path="/policies">
              <PlaceholderPage title="Policies" description="The policies index page is not implemented yet." />
            </Route>

            <Route path="/document-library" component={DocumentLibrary} />
            <Route path="/settings" component={Settings} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/policy-management" component={PolicyManagement} />
            <Route path="/risk-assessment" component={RiskAssessment} />
            <Route path="/vendor-management" component={VendorManagement} />

            <Route component={NotFound} />
          </Switch>
        </div>
      </div>
    </NewPolicyModalProvider>
  );
}

function WorkspaceSetupRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/setup-wizard");
  }, [setLocation]);

  return null;
}

function SessionRedirectToDashboard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/dashboard");
  }, [setLocation]);

  return null;
}

function GatewayRouter() {
  const [location, setLocation] = useLocation();

  const [workspaceComplete, setWorkspaceComplete] = useState(() =>
    isWorkspaceProfileComplete(getStoredWorkspaceProfile()),
  );

  useEffect(() => {
    // Recompute on navigation so /dashboard immediately switches back after Save.
    setWorkspaceComplete(isWorkspaceProfileComplete(getStoredWorkspaceProfile()));
  }, [location]);

  useEffect(() => {
    // Recompute immediately after workspace save.
    const onUpdated = () => {
      setWorkspaceComplete(isWorkspaceProfileComplete(getStoredWorkspaceProfile()));
    };

    window.addEventListener("regready-workspace-profile-updated", onUpdated);
    return () => window.removeEventListener("regready-workspace-profile-updated", onUpdated);
  }, []);

  const geminiKey = getStoredGeminiKey().trim();
  const isActivated = getStoredActivationStatus() && geminiKey.startsWith("AIza") && geminiKey.length > 0;
  const hasSession = Boolean(getSessionUser());

  // Validate token once per mount; if it's stale/invalid, clear it and bounce to login.
  // This prevents repeated 401 spam when the UI still thinks it's authenticated.
  const [hasValidatedAuth, setHasValidatedAuth] = useState(false);

  useEffect(() => {
    if (hasValidatedAuth) return;
    if (!isActivated || !hasSession) return;

    const token = window.localStorage.getItem("auth_token");
    if (!token) {
      setHasValidatedAuth(true);
      setLocation("/login");
      return;
    }

    // Fail-closed: if token is invalid, clear session and redirect.
    fetch("/api/auth/user", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    }).then(async (res) => {
      if (res.status === 401) {
        window.localStorage.removeItem("auth_token");
        clearSessionUser();
        setLocation("/login");
      }
    }).catch(() => {
      // network errors should not wipe auth; token will be validated on the next successful login.
    }).finally(() => setHasValidatedAuth(true));
  }, [hasValidatedAuth, hasSession, isActivated, setLocation]);
  // Use robust "includes" checks since wouter/location may be slightly different depending on env.
  const normalizedLocationForCheck = location.startsWith("/") ? location : `/${location}`;
  const isDashboardPathname = window.location.pathname.startsWith("/dashboard");
  const isDashboardRoute =
    isDashboardPathname || normalizedLocationForCheck.includes("/dashboard");

  const shouldForceWorkspaceSetup =
    isActivated &&
    hasSession &&
    !workspaceComplete &&
    // hard stop: never force workspace setup for /dashboard/*
    !isDashboardPathname &&
    normalizedLocationForCheck !== "/notifications" &&
    // hard stop: never bounce away from the login screen itself
    normalizedLocationForCheck !== "/login";

  // If workspace isn't configured yet, show Setup Wizard even if the user hits /dashboard.
  if (isDashboardPathname) {
    if (shouldForceWorkspaceSetup) return <SetupWizard />;
    return isActivated && hasSession ? <MainAppLayout /> : isActivated ? <Login /> : <Landing />;
  }

  return (
    <Switch>
      <Route path="/activation" component={() => <Activation />} />
      <Route path="/setup-wizard" component={SetupWizard} />
      <Route path="/workspace-setup" component={SetupWizard} />
      <Route path="/trust-center/:token" component={TrustCenter} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/dashboard" component={MainAppLayout} />
      {/* wouter exact-match safety: ensure /dashboard/overview etc mount the sidebar layout */}
      <Route path="/dashboard/:section" component={MainAppLayout} />

      <Route
        path="/login"
        component={
          isActivated
            ? hasSession
              ? shouldForceWorkspaceSetup
                ? SetupWizard
                : SessionRedirectToDashboard
              : Login
            : () => <Activation />
        }
      />

      <Route path="/smoke" component={SmokeTestPage} />
      <Route path="/landing" component={Landing} />
      <Route path="/" component={PageZero} />

      <Route>
        {isActivated && hasSession ? (
          shouldForceWorkspaceSetup ? (
            <WorkspaceSetupRedirect />
          ) : (
            <MainAppLayout />
          )
        ) : isActivated ? (
          <Login />
        ) : (
          <PageZero />
        )}
      </Route>
    </Switch>
  );
}

/**
 * Intentionally no demo-key auto-activation.
 * Users must activate with their own BYOK via /activation.
 */
function bootstrapLocalProDev() {
  return;
}

function App() {
  // Must run before GatewayRouter reads localStorage
  // (no-op now; kept for compatibility)
  bootstrapLocalProDev();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <GatewayRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
