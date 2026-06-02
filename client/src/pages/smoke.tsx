import { useEffect, useState } from "react";
import Header from "@/components/layout/header";

import ComplianceCard from "@/components/compliance/compliance-card";
import RecommendationsEngine from "@/components/compliance/recommendations-engine";
import RiskAssessmentCopilot from "@/components/compliance/risk-assessment-copilot";
import AutoRemediationCopilot from "@/components/compliance/auto-remediation-copilot";

import PolicyDashboard from "@/components/policy/policy-dashboard";
import PolicyCreationModal from "@/components/policy/policy-creation-modal";
import DragDropBuilder from "@/components/policy/drag-drop-builder";

import ComplianceReportGenerator from "@/components/reports/compliance-report-generator";

import TeamManagement from "@/components/team/team-management";
import CollaborationWorkspace from "@/components/team/collaboration-workspace";

import VendorTable from "@/components/vendor/vendor-table";

import type { Vendor } from "@shared/schema";

const mockVendors: Vendor[] = [
  {
    id: 1,
    name: "Cloud Infrastructure",
    type: "Cloud Infrastructure",
    riskLevel: "low",
    gdprCompliant: true,
    soc2Compliant: true,
    aiActCompliant: true,
    lastAssessment: new Date().toISOString(),
    notes: "Mock vendor",
  },
  {
    id: 2,
    name: "Email Marketing",
    type: "Email Marketing",
    riskLevel: "medium",
    gdprCompliant: false,
    soc2Compliant: true,
    aiActCompliant: false,
    lastAssessment: new Date().toISOString(),
    notes: "Mock vendor",
  },
];

const SmokeSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <section className="space-y-3 border border-neutral-200 rounded-xl bg-white/70 p-4">
      <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
      {children}
    </section>
  );
};

export default function SmokeTestPage() {
  const [policyModalOpen, setPolicyModalOpen] = useState(true);

  // Important: set synchronously so child components skip their initial data-fetch.
  (window as any).__SMOKE_TEST__ = true;

  return (
    <div className="min-h-screen bg-[#FCF7EF] text-slate-900">
      <Header title="Smoke Test" description="Renders all major UI components to verify they mount without crashing." />

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <SmokeSection title="Compliance">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ComplianceCard framework="GDPR" percentage={85} status="compliant" />
            <ComplianceCard framework="SOC 2" percentage={72} status="in-progress" />
            <ComplianceCard framework="EU AI Act" percentage={45} status="needs-attention" />
          </div>

          <div className="mt-4">
            <RecommendationsEngine />
          </div>

          <div className="mt-4">
            <RiskAssessmentCopilot />
          </div>

          <div className="mt-4">
            <AutoRemediationCopilot frameworkControl="No Data Retention Policy" label="Fix It" />
          </div>
        </SmokeSection>

        <SmokeSection title="Policy">
          <PolicyDashboard />

          <div className="mt-4">
            <DragDropBuilder
              onPolicyGenerate={() => {
                // no-op for smoke
              }}
            />
          </div>

          <div className="mt-4">
            <PolicyCreationModal open={policyModalOpen} onOpenChange={setPolicyModalOpen} />
          </div>
        </SmokeSection>

        <SmokeSection title="Reports">
          <ComplianceReportGenerator />
        </SmokeSection>

        <SmokeSection title="Team">
          <TeamManagement />
          <div className="mt-4">
            <CollaborationWorkspace />
          </div>
        </SmokeSection>

        <SmokeSection title="Vendor">
          <VendorTable vendors={mockVendors} onViewVendor={() => {}} />
        </SmokeSection>
      </main>
    </div>
  );
}
