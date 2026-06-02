import { useQuery } from "@tanstack/react-query";
import ComplianceCard from "@/components/compliance/compliance-card";
import VendorTable from "@/components/vendor/vendor-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wand2, 
  ClipboardCheck, 
  FileBarChart, 
  Shield, 
  Lock, 
  Bot, 
  Check, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Users,
  FileText
} from "lucide-react";
import type { Vendor, ComplianceFramework } from "@shared/schema";

interface DashboardData {
  complianceOverview: Array<{
    framework: string;
    percentage: number;
    status: string;
  }>;
  recentActivities: Array<{
    title: string;
    timestamp: string;
    type: string;
  }>;
  riskScore: number;
  totalPolicies: number;
  pendingReviews: number;
}

interface OverviewTabProps {
  onNewPolicyClick: () => void;
}

export default function OverviewTab({ onNewPolicyClick }: OverviewTabProps) {
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: frameworks = [] } = useQuery<ComplianceFramework[]>({
    queryKey: ["/api/compliance-frameworks"],
  });

  const mockDashboardData: DashboardData = {
    complianceOverview: [
      { framework: "GDPR", percentage: 85, status: "compliant" },
      { framework: "SOC 2", percentage: 72, status: "in-progress" },
      { framework: "EU AI Act", percentage: 45, status: "needs-attention" },
    ],
    recentActivities: [
      { title: "Privacy Policy updated", timestamp: "2 hours ago", type: "approval" },
      { title: "SOC 2 audit report generated", timestamp: "5 hours ago", type: "ai-generation" },
      { title: "GDPR assessment completed", timestamp: "1 day ago", type: "review" },
    ],
    riskScore: 23,
    totalPolicies: 24,
    pendingReviews: 3,
  };

  const clampPercent = (n: number) => Math.max(0, Math.min(100, n));
  const riskScoreSafe = Number.isFinite((dashboardData as unknown as { riskScore?: unknown } | undefined)?.riskScore)
    ? clampPercent(Number((dashboardData as unknown as { riskScore?: unknown }).riskScore))
    : clampPercent(mockDashboardData.riskScore);

  const riskMeta = (() => {
    if (riskScoreSafe <= 25) {
      return {
        label: "Low Risk (Secure)",
        badgeClass: "bg-emerald-100 text-emerald-700",
        barClass: "bg-emerald-500",
        stripeClass: "border-emerald-500",
      };
    }
    if (riskScoreSafe <= 50) {
      return {
        label: "Medium Risk",
        badgeClass: "bg-orange-100 text-orange-700",
        barClass: "bg-orange-500",
        stripeClass: "border-orange-500",
      };
    }
    if (riskScoreSafe <= 75) {
      return {
        label: "High Risk",
        badgeClass: "bg-red-100 text-red-700",
        barClass: "bg-red-500",
        stripeClass: "border-red-500",
      };
    }
    return {
      label: "Critical Risk",
      badgeClass: "bg-rose-100 text-rose-700",
      barClass: "bg-rose-500",
      stripeClass: "border-rose-500",
    };
  })();

  const displayData: DashboardData = {
    ...mockDashboardData,
    ...(dashboardData ?? {}),
    riskScore: riskScoreSafe,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayData.complianceOverview.map((item) => (
          <ComplianceCard
            key={item.framework}
            framework={item.framework}
            percentage={item.percentage}
            status={item.status}
          />
        ))}
        
        {/* Risk Score Card */}
        <Card className={`border-l-4 ${riskMeta.stripeClass}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${riskMeta.badgeClass.replace("text-", "bg-")}`}>
                <AlertTriangle className={`w-6 h-6 ${riskMeta.badgeClass.replace("bg-", "").replace("text-", "text-").trim()}`} />
              </div>
              <Badge variant="secondary" className={riskMeta.badgeClass}>
                {riskMeta.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold text-neutral-900 mb-1">
              {displayData.riskScore}%
            </h3>
            <p className="text-neutral-600 text-sm mb-2">Risk Score</p>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className={`${riskMeta.barClass} h-2 rounded-full`}
                style={{ width: `${displayData.riskScore}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Policy Activity */}
        <Card>
          <CardHeader className="border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {displayData.recentActivities.map((activity, index) => {
                const icons = {
                  approval: Check,
                  review: Clock,
                  "ai-generation": Wand2,
                };
                const colors = {
                  approval: "bg-green-100 text-green-700",
                  review: "bg-yellow-100 text-yellow-700",
                  "ai-generation": "bg-blue-100 text-blue-700",
                };
                
                const Icon = icons[activity.type as keyof typeof icons] || Check;
                const colorClass = colors[activity.type as keyof typeof colors] || colors.approval;
                
                return (
                  <div key={index} className="flex items-start space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">{activity.title}</p>
                      <p className="text-xs text-neutral-500 mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="border-b border-neutral-200">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start space-x-4 p-4 h-auto border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50"
              onClick={onNewPolicyClick}
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Wand2 className="text-emerald-700 w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-neutral-900">Generate AI Policy</p>
                <p className="text-sm text-neutral-600">Create policy drafts using AI assistance</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start space-x-4 p-4 h-auto border-neutral-200 hover:border-green-200 hover:bg-green-50"
              onClick={() => {
                // Navigate to risk assessment page
                window.location.href = '/risk-assessment';
              }}
              data-testid="run-compliance-check"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ClipboardCheck className="text-green-600 w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-neutral-900">Run Compliance Check</p>
                <p className="text-sm text-neutral-600">Automated assessment across frameworks</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start space-x-4 p-4 h-auto border-neutral-200 hover:border-orange-200 hover:bg-orange-50"
              onClick={() => {
                // Navigate to audit reports page
                window.location.href = '/audit-reports';
              }}
              data-testid="generate-audit-report"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileBarChart className="text-orange-600 w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-neutral-900">Generate Audit Report</p>
                <p className="text-sm text-neutral-600">Export comprehensive compliance report</p>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Compliance */}
      <VendorTable vendors={vendors} onViewVendor={(vendor) => console.log("View vendor:", vendor)} />

      {/* Framework Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {frameworks.map((framework: any) => {
          const icons = {
            GDPR: Shield,
            SOC2: Lock,
            EU_AI_ACT: Bot,
          };
          const colors = {
            compliant: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
            "in-progress": { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" },
            "needs-attention": { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
          };
          
          const Icon = icons[framework.name as keyof typeof icons] || Shield;
          const color = colors[framework.status as keyof typeof colors] || colors["in-progress"];
          
          return (
            <Card key={framework.id} className={`${color.border} border-l-4`}>
              <CardHeader className="border-b border-neutral-200">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color.bg}`}>
                    <Icon className={`w-5 h-5 ${color.text}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{framework.displayName}</CardTitle>
                    <p className="text-sm text-neutral-600">{framework.completionPercentage}% Complete</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {framework.name === "GDPR" && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-700">Data Processing Records</span>
                        <Check className="text-green-600 w-4 h-4" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-700">Privacy Impact Assessments</span>
                        <Check className="text-green-600 w-4 h-4" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-700">Breach Notification</span>
                        <Clock className="text-yellow-600 w-4 h-4" />
                      </div>
                    </>
                  )}
                  
                  {framework.name === "SOC2" && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-700">Security Controls</span>
                        <Check className="text-green-600 w-4 h-4" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-700">Availability Monitoring</span>
                        <Clock className="text-yellow-600 w-4 h-4" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-700">Confidentiality</span>
                        <AlertTriangle className="text-red-600 w-4 h-4" />
                      </div>
                    </>
                  )}
                  
                  {framework.name === "EU_AI_ACT" && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-700">AI Classification</span>
                        <Check className="text-green-600 w-4 h-4" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-700">Risk Assessment</span>
                        <Clock className="text-yellow-600 w-4 h-4" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-700">Human Oversight</span>
                        <AlertTriangle className="text-red-600 w-4 h-4" />
                      </div>
                    </>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => {
                    // Navigate to specific framework details
                    window.location.href = `/compliance-frameworks/${framework.id}`;
                  }}
                  data-testid={`view-framework-details-${framework.id}`}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
