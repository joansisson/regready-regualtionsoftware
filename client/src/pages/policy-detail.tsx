import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  Share, 
  Clock, 
  User, 
  Calendar,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  Eye,
  Printer
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDateMaybe, parseDateMaybe } from "@/lib/utils";
import type { Policy } from "@shared/schema";

const statusConfig = {
  draft: { color: "bg-neutral-100 text-neutral-700", label: "Draft", icon: Edit },
  "under-review": { color: "bg-yellow-100 text-yellow-700", label: "Under Review", icon: Clock },
  approved: { color: "bg-green-100 text-green-700", label: "Approved", icon: CheckCircle },
  archived: { color: "bg-neutral-200 text-neutral-600", label: "Archived", icon: FileText },
} as const;

export default function PolicyDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const policyId = params.id ? parseInt(params.id) : 0;

  const { data: policy, isLoading, error } = useQuery<Policy>({
    queryKey: ["/api/policies", policyId],
    enabled: !!policyId,
  });

  const exportPolicyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/policies/${policyId}/export`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${policy?.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Export Successful",
        description: "Policy has been exported as PDF.",
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Failed to export policy as PDF.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await apiRequest("PUT", `/api/policies/${policyId}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policies", policyId] });
      toast({
        title: "Status Updated",
        description: "Policy status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update policy status.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading policy...</p>
        </div>
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Policy Not Found</h2>
          <p className="text-neutral-600 mb-4">
            The policy you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => setLocation('/policies')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Policies
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[policy.status as keyof typeof statusConfig];
  const StatusIcon = statusInfo?.icon || FileText;

  // Mock policy content for demonstration
  const mockPolicyContent = `
# ${policy.title}

## 1. Purpose and Scope

This policy establishes the framework for ${policy.type.replace('-', ' ')} within our organization. It applies to all employees, contractors, and third-party vendors who have access to our systems and data.

## 2. Policy Statement

We are committed to maintaining the highest standards of ${policy.type.replace('-', ' ')} in accordance with applicable regulations and industry best practices.

## 3. Responsibilities

### 3.1 Management Responsibilities
- Ensure adequate resources for policy implementation
- Regular review and approval of policy updates
- Oversight of compliance monitoring

### 3.2 Employee Responsibilities
- Understand and comply with this policy
- Report any violations or concerns
- Participate in required training programs

## 4. Implementation Guidelines

### 4.1 Technical Controls
- Implementation of appropriate technical safeguards
- Regular system monitoring and auditing
- Incident response procedures

### 4.2 Administrative Controls
- Regular training and awareness programs
- Documentation and record keeping
- Third-party management

## 5. Monitoring and Enforcement

This policy will be monitored through:
- Regular audits and assessments
- Incident tracking and analysis
- Performance metrics and reporting

## 6. Policy Review

This policy will be reviewed annually or when:
- Regulatory requirements change
- Significant business changes occur
- Security incidents indicate policy updates are needed

## 7. Related Documents

- Information Security Policy
- Data Protection Policy
- Incident Response Procedures
- Training and Awareness Program

---

*Policy Version: ${policy.version}*
*Last Updated: ${formatDateMaybe(policy.updatedAt)}*
*Next Review Date: ${
  (() => {
    const d = parseDateMaybe(policy.updatedAt);
    if (!d) return "—";
    d.setFullYear(d.getFullYear() + 1);
    return d.toLocaleDateString();
  })()
}*
  `.trim();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/policies')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Policies
          </Button>
        </div>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-3">
              <Shield className="h-6 w-6 text-blue-600" />
              {policy.title}
            </h1>
            <p className="text-neutral-600 mt-1">{policy.description}</p>
            
            <div className="flex items-center gap-4 mt-4">
              <Badge className={statusInfo.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusInfo.label}
              </Badge>
              <span className="text-sm text-neutral-500 capitalize">
                {policy.type.replace('-', ' ')}
              </span>
              {policy.frameworks && policy.frameworks.length > 0 && (
                <div className="flex gap-1">
                  {policy.frameworks.map((framework) => (
                    <Badge key={framework} variant="outline" className="text-xs">
                      {framework}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation(`/policies/${policy.id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => exportPolicyMutation.mutate()}
              disabled={exportPolicyMutation.isPending}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Policy Content */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Policy Document
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <div 
                      className="whitespace-pre-wrap text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: mockPolicyContent.replace(/^#\s(.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>')
                                                .replace(/^##\s(.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
                                                .replace(/^###\s(.+)$/gm, '<h3 class="text-base font-medium mt-3 mb-2">$1</h3>')
                                                .replace(/^\*(.+)\*$/gm, '<em>$1</em>')
                                                .replace(/^-\s(.+)$/gm, '<li class="ml-4">$1</li>')
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Policy Metadata */}
            <div className="space-y-6">
              {/* Policy Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Policy Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-neutral-700 mb-1">Version</div>
                    <div className="text-sm text-neutral-900">{policy.version}</div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <div className="text-sm font-medium text-neutral-700 mb-1">Created</div>
                    <div className="text-sm text-neutral-900 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDateMaybe(policy.createdAt)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-neutral-700 mb-1">Last Updated</div>
                    <div className="text-sm text-neutral-900 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateMaybe(policy.updatedAt)}
                    </div>
                  </div>
                  
                  {policy.createdBy && (
                    <div>
                      <div className="text-sm font-medium text-neutral-700 mb-1">Created By</div>
                      <div className="text-sm text-neutral-900 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        User {policy.createdBy}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {policy.status === 'draft' && (
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => updateStatusMutation.mutate('under-review')}
                      disabled={updateStatusMutation.isPending}
                    >
                      Submit for Review
                    </Button>
                  )}
                  
                  {policy.status === 'under-review' && (
                    <>
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => updateStatusMutation.mutate('approved')}
                        disabled={updateStatusMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => updateStatusMutation.mutate('draft')}
                        disabled={updateStatusMutation.isPending}
                      >
                        Request Changes
                      </Button>
                    </>
                  )}
                  
                  {policy.status === 'approved' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => updateStatusMutation.mutate('archived')}
                      disabled={updateStatusMutation.isPending}
                    >
                      Archive Policy
                    </Button>
                  )}
                  
                  <Separator />
                  
                  <Button size="sm" variant="outline" className="w-full">
                    <Eye className="w-3 h-3 mr-1" />
                    View History
                  </Button>
                  
                  <Button size="sm" variant="outline" className="w-full">
                    <Printer className="w-3 h-3 mr-1" />
                    Print
                  </Button>
                </CardContent>
              </Card>

              {/* Framework Coverage */}
              {policy.frameworks && policy.frameworks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Framework Coverage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {policy.frameworks.map((framework) => (
                        <div key={framework} className="flex items-center justify-between">
                          <span className="text-sm text-neutral-700">{framework}</span>
                          <Badge variant="outline" className="text-xs">
                            Compliant
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
