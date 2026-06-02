import Header from "@/components/layout/header";
import RiskAssessmentCopilot from "@/components/compliance/risk-assessment-copilot";

export default function RiskAssessmentPage() {
  return (
    <>
      <Header
        title="Risk Assessment"
        description="Analyze operational and compliance risk across your selected frameworks"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <RiskAssessmentCopilot />
      </main>
    </>
  );
}
