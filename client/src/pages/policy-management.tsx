import { useState } from "react";
import Header from "@/components/layout/header";
import PolicyDashboard from "@/components/policy/policy-dashboard";
import PolicyCreationModal from "@/components/policy/policy-creation-modal";

export default function PolicyManagement() {
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  return (
    <>
      <Header
        title="Policy Management"
        description="Create, manage, and track your compliance policy documents"
        onNewPolicyClick={() => setIsPolicyModalOpen(true)}
      />

      <main className="flex-1 overflow-y-auto p-6">
        <PolicyDashboard onNewPolicyClick={() => setIsPolicyModalOpen(true)} />
      </main>

      <PolicyCreationModal
        open={isPolicyModalOpen}
        onOpenChange={setIsPolicyModalOpen}
      />
    </>
  );
}
