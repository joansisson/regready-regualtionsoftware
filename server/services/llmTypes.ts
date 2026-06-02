export interface PolicyGenerationRequest {
  title: string;
  type: string;
  description: string;
  frameworks: string[];
  companyName?: string;
  industry?: string;
}

export interface GeneratedPolicy {
  title: string;
  content: string;
  sections: string[];
  complianceNotes: Record<string, string>;
}

export type RemediationAuditBoundary = {
  handlesPIIorPHI?: "none" | "pii" | "phi" | "both";
  hasPhysicalOffices?: boolean;
};

export type RemediationEvidencePipeline = {
  primaryTicketingSystem?: string;
  whereSystemLogsAreCentralized?: string;
};

export type RemediationAccessControl = {
  timeToRevokeOffboarding?: "same-day" | "24-hours" | "48-hours" | "custom";
  customTimeToRevoke?: string;

  authMethod?: "password-manager" | "sso" | "both" | "other";
};

export type RemediationInfrastructureDetail = {
  usesInfrastructureAsCode?: boolean;
  dataRetentionPolicyDuration?: string;
};

export type RemediationProTipAnswers = {
  auditBoundary?: RemediationAuditBoundary;
  evidencePipeline?: RemediationEvidencePipeline;
  accessControl?: RemediationAccessControl;
  infrastructureDetail?: RemediationInfrastructureDetail;
};

export interface RemediationSuggestRequest {
  frameworkControl: string; // e.g. "NIST 800-53 AC-2" or "GDPR Art. 30"
  policyText: string; // user's current policy text (paste from UI)
  industry?: string;
  companySize?: string;
  techStack?: string[]; // derived from Vendors table, or user-input

  /**
   * Optional pro-tip answers from the workspace setup wizard.
   * Used to produce auditor-grade, tool-specific remediation guidance.
   */
  proTipAnswers?: RemediationProTipAnswers;
}

export interface RemediationSuggestResponse {
  diffSummary: string;
  suggestedPolicyPatch: string;
  technicalTasks: Array<{
    title: string;
    checklist: string[];
  }>;
}

export type RecommendationPriority = "high" | "medium" | "low";
export type RecommendationCategory = "security" | "privacy" | "compliance" | "governance";

export type RecommendationGenerationInput = {
  frameworks: Array<{
    id?: number;
    name: string;
    displayName: string;
    completionPercentage?: number | null;
    status?: string | null;
  }>;
  policies: Array<{
    id?: number;
    title: string;
    status: string;
    frameworks: string[];
    description?: string | null;
    content?: string | null;
  }>;
  complianceChecks: Array<{
    id?: number;
    frameworkId?: number;
    checkName: string;
    description?: string | null;
    status?: string | null;
    evidence?: string | null;
  }>;
  vendors: Array<{
    id?: number;
    name: string;
    type?: string | null;
    notes?: string | null;
    riskLevel?: string | null;
  }>;
};

export type Recommendation = {
  id: string;
  title: string;
  description: string;

  priority: RecommendationPriority;
  category: RecommendationCategory;

  impact: number; // 0-100
  effort: number; // 0-100
  frameworks: string[]; // framework names
  implementationSteps: string[];

  timeline: string;
  riskReduction: number; // 0-100
};
