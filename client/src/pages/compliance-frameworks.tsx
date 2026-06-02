import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Lock, Bot, Check, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import type { ComplianceFramework } from "@shared/schema";

const frameworkConfig = {
  GDPR: {
    icon: Shield,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "General Data Protection Regulation compliance for data privacy and protection",
    requirements: [
      "Data Processing Records",
      "Privacy Impact Assessments",
      "Data Subject Rights",
      "Breach Notification Procedures",
      "Data Protection Officer",
      "Privacy by Design"
    ]
  },
  SOC2: {
    icon: Lock,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    description: "SOC 2 security standards for availability, processing integrity, confidentiality, and privacy",
    requirements: [
      "Security Controls",
      "Availability Monitoring",
      "Processing Integrity",
      "Confidentiality Measures",
      "Privacy Controls",
      "Access Management"
    ]
  },
  EU_AI_ACT: {
    icon: Bot,
    color: "text-green-600",
    bgColor: "bg-green-50",
    description: "European Union AI Act compliance for artificial intelligence systems",
    requirements: [
      "AI System Classification",
      "Risk Assessment",
      "Documentation Requirements",
      "Human Oversight",
      "Transparency Obligations",
      "Quality Management"
    ]
  }
} as const;

const statusConfig = {
  compliant: {
    color: "bg-success/10 text-success",
    label: "Compliant",
    icon: Check,
    description: "All requirements met"
  },
  "in-progress": {
    color: "bg-warning/10 text-warning",
    label: "In Progress",
    icon: Clock,
    description: "Implementation underway"
  },
  "needs-attention": {
    color: "bg-error/10 text-error",
    label: "Needs Attention",
    icon: AlertTriangle,
    description: "Requires immediate action"
  }
} as const;

const frameworkNameMapping = {
  gdpr: "GDPR",
  soc2: "SOC2",
  "eu-ai-act": "EU_AI_ACT"
} as const;

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

const getLastUpdatedDisplay = (raw: unknown) => {
  const pendingText = "Status: Initial Assessment Pending";

  if (raw == null) return { text: pendingText, isPending: true };

  // Handle Date objects (or date-like objects)
  if (raw instanceof Date) {
    const ms = raw.getTime();
    if (!Number.isFinite(ms)) return { text: pendingText, isPending: true };
    return { text: raw.toLocaleDateString(), isPending: false };
  }

  // Handle string/number timestamps
  if (typeof raw === "string") {
    if (raw.trim().length === 0) return { text: pendingText, isPending: true };
    const ms = Date.parse(raw);
    if (!Number.isFinite(ms)) return { text: pendingText, isPending: true };
    return { text: new Date(ms).toLocaleDateString(), isPending: false };
  }

  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return { text: pendingText, isPending: true };
    return { text: new Date(raw).toLocaleDateString(), isPending: false };
  }

  return { text: pendingText, isPending: true };
};

export default function ComplianceFrameworks() {
  const { data, isLoading, error } = useQuery<ComplianceFramework[]>({
    queryKey: ["/api/compliance-frameworks"],
  });

  const frameworks = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading compliance frameworks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading frameworks: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Compliance Frameworks"
        description="Monitor and manage your compliance across multiple regulatory frameworks"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {frameworks.map((framework) => {
            const configKey = frameworkNameMapping[framework.name as keyof typeof frameworkNameMapping] || framework.name;
            const config = frameworkConfig[configKey as keyof typeof frameworkConfig];
            const percentage = toNumber(framework.completionPercentage);
            const mappedStatus = framework.status === "active"
              ? (percentage >= 90 ? "compliant" : "in-progress")
              : "needs-attention";

            const statusInfo = statusConfig[mappedStatus as keyof typeof statusConfig];
            const Icon = config?.icon || Shield;
            const StatusIcon = statusInfo?.icon || Clock;

            return (
              <Card key={framework.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config?.bgColor || "bg-neutral-50"}`}>
                      <Icon className={`w-6 h-6 ${config?.color || "text-neutral-600"}`} />
                    </div>
                    <Badge className={statusInfo.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{framework.displayName}</CardTitle>
                  <p className="text-sm text-neutral-600">{config?.description}</p>
                </CardHeader>

                <CardContent>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-neutral-700">Progress</span>
                      <span className="text-2xl font-bold text-neutral-900">{percentage}%</span>
                    </div>
                    <Progress value={percentage} className="h-3" />
                    <p className="text-xs text-neutral-500 mt-1">{statusInfo.description}</p>
                  </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        window.location.href = `/compliance-frameworks/${framework.id}`;
                      }}
                      data-testid={`view-framework-${framework.id}`}
                    >
                      View Details
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-8">
          {frameworks.map((framework) => {
            const configKey = frameworkNameMapping[framework.name as keyof typeof frameworkNameMapping] || framework.name;
            const config = frameworkConfig[configKey as keyof typeof frameworkConfig];
            const Icon = config?.icon || Shield;
            const percentage = toNumber(framework.completionPercentage);

            return (
              <Card key={`${framework.id}-details`}>
                <CardHeader className="border-b border-neutral-200">
                  <div className="flex items-center space-x-4">
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${config?.bgColor || "bg-neutral-50"}`}>
                      <Icon className={`w-7 h-7 ${config?.color || "text-neutral-600"}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl">{framework.displayName}</CardTitle>
                      <p className="text-neutral-600 mt-1">{config?.description}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        {(() => {
                          const lastUpdated = getLastUpdatedDisplay(framework.lastUpdated);
                          return (
                            <span className="text-sm text-slate-500">
                              {lastUpdated.isPending ? lastUpdated.text : `Last updated: ${lastUpdated.text}`}
                            </span>
                          );
                        })()}
                        <span className="text-sm font-medium">
                          {percentage}% Complete
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-2">
                    {config?.requirements?.map((requirement, index) => {
                      const isCompleted = (index + 1) / config.requirements.length <= percentage / 100;
                      const isInProgress =
                        !isCompleted &&
                        (index + 1) / config.requirements.length <= (percentage + 20) / 100;

                      const pill = isCompleted
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : isInProgress
                          ? "bg-orange-50 border-orange-200 text-orange-800"
                          : "bg-neutral-50 border-neutral-200 text-neutral-700";

                      const Icon = isCompleted ? Check : isInProgress ? Clock : AlertTriangle;

                      return (
                        <span
                          key={requirement}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${pill}`}
                          title={requirement}
                        >
                          <Icon className="w-4 h-4" />
                          {requirement}
                        </span>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex gap-4">
                    <Button
                      onClick={() => {
                        window.location.href = `/compliance-frameworks/${framework.id}/checklist`;
                      }}
                      data-testid={`view-checklist-${framework.id}`}
                    >
                      View Checklist
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.location.href = `/risk-assessment?framework=${framework.name}`;
                      }}
                      data-testid={`run-assessment-${framework.id}`}
                    >
                      Run Assessment
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.location.href = `/audit-reports?framework=${framework.name}`;
                      }}
                      data-testid={`generate-report-${framework.id}`}
                    >
                      Generate Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {frameworks.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">No compliance frameworks found</h3>
              <p className="text-neutral-600">
                Compliance frameworks will be automatically initialized when you start using the platform.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
