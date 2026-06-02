import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Folder, Search, FileText, Download, Eye, Upload, Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Policy, AuditReport } from "@shared/schema";
import { formatDateMaybe, parseDateMaybe } from "@/lib/utils";

const documentTypeConfig = {
  policy: { 
    icon: FileText, 
    color: "bg-blue-50 text-blue-700", 
    label: "Policy" 
  },
  "audit-report": { 
    icon: FileText, 
    color: "bg-green-50 text-green-700", 
    label: "Audit Report" 
  },
  template: { 
    icon: FileText, 
    color: "bg-purple-50 text-purple-700", 
    label: "Template" 
  },
  certificate: { 
    icon: FileText, 
    color: "bg-orange-50 text-orange-700", 
    label: "Certificate" 
  },
} as const;

const statusConfig = {
  draft: { color: "bg-neutral-100 text-neutral-700", label: "Draft", icon: Clock },
  approved: { color: "bg-success/10 text-success", label: "Approved", icon: CheckCircle },
  "under-review": { color: "bg-warning/10 text-warning", label: "Under Review", icon: AlertCircle },
  final: { color: "bg-success/10 text-success", label: "Final", icon: CheckCircle },
  archived: { color: "bg-neutral-200 text-neutral-600", label: "Archived", icon: Clock },
} as const;

export default function DocumentLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: policiesData, isLoading: policiesLoading, error: policiesError } = useQuery<Policy[]>({
    queryKey: ["/api/policies"],
  });

  const { data: auditReportsData, isLoading: reportsLoading, error: reportsError } = useQuery<AuditReport[]>({
    queryKey: ["/api/audit-reports"],
  });

  // Debug logging
  console.log('Policies data:', policiesData, 'Type:', typeof policiesData, 'Is array:', Array.isArray(policiesData));
  console.log('Audit reports data:', auditReportsData, 'Type:', typeof auditReportsData, 'Is array:', Array.isArray(auditReportsData));

  // Ensure data is always an array to prevent map errors
  const policies = Array.isArray(policiesData) ? policiesData : [];
  const auditReports = Array.isArray(auditReportsData) ? auditReportsData : [];

  // Combine all documents into a unified structure
  const allDocuments = [
    ...policies.map(policy => ({
      id: `policy-${policy.id}`,
      title: policy.title,
      type: "policy" as const,
      status: policy.status,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
      category: policy.type,
      frameworks: policy.frameworks || [],
      version: policy.version,
      createdBy: policy.createdBy,
      originalData: policy,
    })),
    ...auditReports.map(report => ({
      id: `report-${report.id}`,
      title: report.title,
      type: "audit-report" as const,
      status: report.status,
      createdAt: report.generatedAt,
      updatedAt: report.generatedAt,
      category: report.type,
      frameworks: report.framework ? [report.framework] : [],
      version: "1.0",
      createdBy: report.generatedBy,
      originalData: report,
    })),
  ];

  const filteredDocuments = allDocuments.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || doc.type === categoryFilter;
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Group documents by category for better organization
  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    const category = doc.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, typeof filteredDocuments>);

  // Calculate overview metrics
  const totalDocuments = allDocuments.length;
  const recentDocuments = allDocuments.filter((doc) => {
    const docDate = parseDateMaybe(doc.createdAt);
    if (!docDate) return false;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return docDate >= weekAgo;
  }).length;
  const draftDocuments = allDocuments.filter(doc => doc.status === "draft").length;
  const approvedDocuments = allDocuments.filter(doc => doc.status === "approved" || doc.status === "final").length;

  const isLoading = policiesLoading || reportsLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading document library...</p>
        </div>
      </div>
    );
  }

  if (policiesError || reportsError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading documents: {policiesError?.message || reportsError?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Document Library" 
        description="Centralized repository for all compliance documents, policies, and reports"
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Total Documents</p>
                  <p className="text-2xl font-bold text-neutral-900">{totalDocuments}</p>
                </div>
                <Folder className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Recent (7 days)</p>
                  <p className="text-2xl font-bold text-primary">{recentDocuments}</p>
                </div>
                <Calendar className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Draft Documents</p>
                  <p className="text-2xl font-bold text-warning">{draftDocuments}</p>
                </div>
                <Clock className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Approved</p>
                  <p className="text-2xl font-bold text-success">{approvedDocuments}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="policy">Policies</SelectItem>
              <SelectItem value="audit-report">Audit Reports</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="under-review">Under Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="final">Final</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Document Views */}
        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="category">By Category</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            {filteredDocuments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Folder className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">No documents found</h3>
                  <p className="text-neutral-600">
                    {allDocuments.length === 0 
                      ? "Your document library is empty. Create some policies or reports to get started."
                      : "Try adjusting your search or filter criteria."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Document
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Frameworks
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {filteredDocuments.map((doc) => {
                          const typeConfig = documentTypeConfig[doc.type];
                          const statusInfo = statusConfig[doc.status as keyof typeof statusConfig];
                          const TypeIcon = typeConfig?.icon || FileText;
                          
                          return (
                            <tr key={doc.id} className="hover:bg-neutral-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${typeConfig.color}`}>
                                    <TypeIcon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-neutral-900">{doc.title}</p>
                                    <p className="text-xs text-neutral-500">
                                      v{doc.version} • {doc.createdBy}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge variant="secondary" className={typeConfig.color}>
                                  {typeConfig.label}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge variant="secondary" className={statusInfo?.color}>
                                  {statusInfo?.label || doc.status}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {doc.frameworks.map((framework) => (
                                    <Badge key={framework} variant="outline" className="text-xs">
                                      {framework.toUpperCase()}
                                    </Badge>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                                {formatDateMaybe(doc.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <Button variant="ghost" size="sm">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="grid" className="mt-6">
            {filteredDocuments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Folder className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">No documents found</h3>
                  <p className="text-neutral-600">
                    Try adjusting your search or filter criteria.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments.map((doc) => {
                  const typeConfig = documentTypeConfig[doc.type];
                  const statusInfo = statusConfig[doc.status as keyof typeof statusConfig];
                  const TypeIcon = typeConfig?.icon || FileText;
                  
                  return (
                    <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeConfig.color}`}>
                              <TypeIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-lg line-clamp-2">{doc.title}</CardTitle>
                              <p className="text-sm text-neutral-600">v{doc.version}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className={statusInfo?.color}>
                            {statusInfo?.label || doc.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-600">Type:</span>
                            <Badge variant="outline" className={typeConfig.color}>
                              {typeConfig.label}
                            </Badge>
                          </div>
                          
                          {doc.frameworks.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-sm text-neutral-600">Frameworks:</span>
                              <div className="flex flex-wrap gap-1">
                                {doc.frameworks.map((framework) => (
                                  <Badge key={framework} variant="outline" className="text-xs">
                                    {framework.toUpperCase()}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="text-xs text-neutral-500 space-y-1">
                            <div>Created: {formatDateMaybe(doc.createdAt)}</div>
                            <div>By: {doc.createdBy}</div>
                          </div>
                          
                          <div className="flex items-center gap-2 pt-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="category" className="mt-6">
            {Object.keys(groupedDocuments).length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Folder className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">No documents found</h3>
                  <p className="text-neutral-600">
                    Try adjusting your search or filter criteria.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedDocuments).map(([category, docs]) => (
                  <Card key={category}>
                    <CardHeader className="border-b border-neutral-200">
                      <CardTitle className="capitalize">
                        {category.replace("-", " ")} ({docs.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {docs.map((doc) => {
                          const typeConfig = documentTypeConfig[doc.type];
                          const statusInfo = statusConfig[doc.status as keyof typeof statusConfig];
                          const TypeIcon = typeConfig?.icon || FileText;
                          
                          return (
                            <div 
                              key={doc.id}
                              className="flex items-center space-x-3 p-3 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors"
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeConfig.color}`}>
                                <TypeIcon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-neutral-900 truncate">
                                  {doc.title}
                                </p>
                                <p className="text-xs text-neutral-500">
                                  v{doc.version} • {formatDateMaybe(doc.createdAt)}
                                </p>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Badge variant="secondary" className={`${statusInfo?.color} text-xs`}>
                                  {statusInfo?.label || doc.status}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
