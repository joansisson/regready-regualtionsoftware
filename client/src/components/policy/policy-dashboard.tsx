import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Download,
  Clock,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Policy } from "@shared/schema";
import type { LLMProvider } from "@/lib/auth";
import DragDropBuilder from "./drag-drop-builder";

interface PolicySection {
  id: string;
  type: "header" | "paragraph" | "list" | "table" | "requirement" | "definition";
  title: string;
  content: string;
  items?: string[];
  priority?: "low" | "medium" | "high" | "critical";
  framework?: string[];
}

interface PolicyDashboardProps {
  onNewPolicyClick?: () => void;
}

const statusConfig = {
  draft: { color: "bg-neutral-100 text-neutral-700", label: "Draft", icon: Edit },
  "under-review": { color: "bg-yellow-100 text-yellow-700", label: "Under Review", icon: Clock },
  approved: { color: "bg-green-100 text-green-700", label: "Approved", icon: CheckCircle },
  archived: { color: "bg-neutral-200 text-neutral-600", label: "Archived", icon: Clock },
} as const;

const getUniqueFrameworks = (sections: PolicySection[]) =>
  sections.flatMap((section) => section.framework || []).filter((framework, index, array) => array.indexOf(framework) === index);

export default function PolicyDashboard({ onNewPolicyClick }: PolicyDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderSections, setBuilderSections] = useState<PolicySection[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: policiesResponse, isLoading } = useQuery<{
    data: Policy[];
    pagination: unknown;
  }>({
    queryKey: ["/api/policies"],
  });

  const { data: apiValidateResponse } = useQuery<{
    provider: LLMProvider;
    hasApiKey: boolean;
    isValidated: boolean;
    last4: string | null;
    validatedAt: string | null;
    message?: string;
  }>({
    queryKey: ["/api/user/settings/api-key/validate"],
  });

  const isValidated = apiValidateResponse?.isValidated ?? null;

  useEffect(() => {
    const validateQueryKey = ["/api/user/settings/api-key/validate"];

    const onApiStatusUpdated = () => {
      queryClient.invalidateQueries({ queryKey: validateQueryKey });
    };

    window.addEventListener("regready:api-status-updated", onApiStatusUpdated);
    return () => window.removeEventListener("regready:api-status-updated", onApiStatusUpdated);
  }, [queryClient]);

  const policies: Policy[] = policiesResponse?.data || [];

  const createPolicyMutation = useMutation({
    mutationFn: async (policyData: unknown) => {
      const response = await apiRequest("POST", "/api/policies", policyData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      toast({
        title: "Policy Created",
        description: "Policy has been successfully created from your design.",
      });
      setShowBuilder(false);
      setBuilderSections([]);
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create policy. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePolicyGenerate = (sections: PolicySection[]) => {
    const content = sections
      .map((section) => {
        switch (section.type) {
          case "header":
            return `\n### ${section.title}\n`;
          case "paragraph":
            return `\n**${section.title}**\n${section.content}\n`;
          case "list":
            return `\n**${section.title}**\n${section.items?.map((item) => `- ${item}`).join("\n")}\n`;
          case "requirement": {
            const priority = section.priority ? ` (Priority: ${section.priority})` : "";
            const framework = section.framework ? ` [${section.framework.join(", ").toUpperCase()}]` : "";
            return `\n**${section.title}**${priority}${framework}\n${section.content}\n`;
          }
          case "definition":
            return `\n**${section.title}**: ${section.content}\n`;
          case "table":
            return `\n**${section.title}**\n\n${section.content}\n`;
          default:
            return `\n${section.content}\n`;
        }
      })
      .join("\n");

    const frameworks = getUniqueFrameworks(sections);
    const hasRequirements = sections.some((section) => section.type === "requirement");

    const policyData = {
      type: hasRequirements ? "compliance" : "general",
      title: sections.find((section) => section.type === "header")?.title || "Custom Policy Document",
      description: `Policy created using drag-and-drop builder with ${sections.length} sections`,
      content,
      version: "1.0",
      status: "under-review",
      frameworks: frameworks.length > 0 ? frameworks : ["gdpr"],
      createdBy: "1",
      organizationId: "1",
    };

    createPolicyMutation.mutate(policyData);
  };

  const filteredPolicies = policies.filter(
    (policy) =>
      policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const policyStats = {
    total: policies.length,
    draft: policies.filter((policy) => policy.status === "draft").length,
    approved: policies.filter((policy) => policy.status === "approved").length,
    underReview: policies.filter((policy) => policy.status === "under-review").length,
  };

  if (showBuilder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Policy Document Builder</h2>
            <p className="text-neutral-600">Create compliance documents with drag-and-drop components</p>
          </div>
          <Button variant="outline" onClick={() => setShowBuilder(false)} data-testid="close-builder">
            Back to Dashboard
          </Button>
        </div>

        <DragDropBuilder onPolicyGenerate={handlePolicyGenerate} initialSections={builderSections} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Policy Management Dashboard</h2>
          <p className="text-neutral-600">Create, manage, and track your compliance documents</p>
        </div>
        <div className="flex gap-2">
          {onNewPolicyClick && (
            <Button
              onClick={onNewPolicyClick}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="create-policy-ai"
            >
              <FileText className="h-4 w-4 mr-2" />
              AI Generate
            </Button>
          )}
          <Button
            onClick={() => setShowBuilder(true)}
            variant="outline"
            data-testid="open-policy-builder"
          >
            <Plus className="h-4 w-4 mr-2" />
            Build New Policy
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">Total Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{policyStats.total}</span>
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">Draft Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{policyStats.draft}</span>
              <Edit className="h-5 w-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">Under Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{policyStats.underReview}</span>
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{policyStats.approved}</span>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search policies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-policies"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPolicies.map((policy) => {
          const StatusIcon = statusConfig[policy.status as keyof typeof statusConfig]?.icon || FileText;

          return (
            <Card key={policy.id} className="hover:shadow-lg transition-shadow duration-200" data-testid={`policy-card-${policy.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2 mb-2">{policy.title}</CardTitle>
                    <Badge className={statusConfig[policy.status as keyof typeof statusConfig]?.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig[policy.status as keyof typeof statusConfig]?.label}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-neutral-600 line-clamp-3">
                  {policy.description || "No description available"}
                </p>

                <div className="flex flex-wrap gap-1">
                  {policy.frameworks?.map((framework) => (
                    <Badge key={framework} variant="secondary" className="text-xs">
                      {framework.toUpperCase()}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Version {policy.version}</span>
                  <span>{new Date(policy.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPolicies.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-neutral-400 mb-4" />

            {searchTerm ? (
              <>
                <h3 className="text-lg font-medium text-neutral-600 mb-2">No policies found</h3>
                <p className="text-neutral-500 mb-4">Try adjusting your search terms</p>
              </>
            ) : isValidated === false ? (
              <>
                <h3 className="text-lg font-medium text-neutral-600 mb-2">Configuration Required</h3>
                <p className="text-neutral-500 mb-4">
                  Your AI Engine is not configured. Please add a valid Gemini API key in Settings to start generating policies.
                </p>
                <Link href="/dashboard/settings">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Go to Settings
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-neutral-600 mb-2">No policies yet</h3>
                <p className="text-neutral-500 mb-4">Create your first compliance policy document</p>
                <Button onClick={() => setShowBuilder(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Build Your First Policy
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
