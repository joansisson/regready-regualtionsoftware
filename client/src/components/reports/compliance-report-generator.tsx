import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileDown, FileType, Clock, AlertTriangle } from "lucide-react";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  frameworks: string[];
  sections: string[];
  estimatedPages: number;
  generationTime: string;
}

export default function ComplianceReportGenerator() {
  const { toast } = useToast();

  const reportTemplates: ReportTemplate[] = [
    {
      id: "comprehensive",
      name: "Comprehensive Compliance Report",
      description:
        "Complete assessment across all implemented frameworks with detailed findings and recommendations",
      frameworks: ["GDPR", "SOC 2", "EU AI Act"],
      sections: ["Executive Summary", "Compliance Status", "Risk Analysis", "Recommendations", "Action Plan"],
      estimatedPages: 25,
      generationTime: "3-5 minutes",
    },
    {
      id: "gdpr-focused",
      name: "GDPR Privacy Assessment",
      description: "Detailed GDPR compliance assessment with privacy controls and data protection measures",
      frameworks: ["GDPR"],
      sections: ["Privacy Controls", "Data Processing", "Subject Rights", "Breach Procedures"],
      estimatedPages: 15,
      generationTime: "2-3 minutes",
    },
    {
      id: "soc2-audit",
      name: "SOC 2 Security Audit",
      description: "SOC 2 Type II readiness assessment with security controls and operational effectiveness",
      frameworks: ["SOC 2"],
      sections: ["Security Controls", "Access Management", "Monitoring", "Incident Response"],
      estimatedPages: 20,
      generationTime: "3-4 minutes",
    },
    {
      id: "ai-governance",
      name: "AI Governance Report",
      description: "EU AI Act compliance assessment with AI system classification and risk management",
      frameworks: ["EU AI Act"],
      sections: ["AI System Inventory", "Risk Classification", "Governance Framework", "Oversight Procedures"],
      estimatedPages: 18,
      generationTime: "2-4 minutes",
    },
    {
      id: "executive-summary",
      name: "Executive Summary Dashboard",
      description: "High-level overview for leadership with key metrics and strategic recommendations",
      frameworks: ["GDPR", "SOC 2", "EU AI Act"],
      sections: ["Key Metrics", "Compliance Status", "Strategic Recommendations"],
      estimatedPages: 8,
      generationTime: "1-2 minutes",
    },
  ];

  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const selectedTemplateData = useMemo(
    () => reportTemplates.find((t) => t.id === selectedTemplate),
    [reportTemplates, selectedTemplate],
  );

  const [reportFormat, setReportFormat] = useState<"pdf" | "docx" | "excel">("pdf");
  const [includeCertification, setIncludeCertification] = useState(false);

  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedTemplateData) {
      setSelectedFrameworks([]);
      setSelectedSections([]);
      return;
    }
    setSelectedFrameworks(selectedTemplateData.frameworks);
    setSelectedSections(selectedTemplateData.sections);
  }, [selectedTemplateData]);

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplateData) {
        throw new Error("Template required");
      }
      if (reportFormat !== "pdf") {
        // Backend currently generates PDFs only.
        throw new Error("Only PDF format is supported in this version.");
      }

      const payload = {
        title: selectedTemplateData.name,
        templateId: selectedTemplateData.id,
        format: reportFormat,
        includeCertification,
        frameworks: selectedFrameworks,
        sections: selectedSections,
      };

      return apiRequest("POST", "/api/compliance-reports/export", payload);
    },
    onSuccess: async (response) => {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance-report-${selectedTemplateData?.id ?? "template"}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      window.URL.revokeObjectURL(url);

      toast({
        title: "Report generated",
        description: "Your compliance report PDF is downloading now.",
      });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to generate report.";
      toast({
        title: "Generation Failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const toggleSection = (section: string) => {
    setSelectedSections((current) => {
      if (current.includes(section)) return current.filter((s) => s !== section);
      return [...current, section];
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <FileDown className="h-6 w-6 text-blue-600" />
          Compliance Report Generator
        </h2>
        <p className="text-neutral-600">Generate comprehensive compliance reports with one click</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Selection */}
              <div>
                <label className="text-sm font-medium text-neutral-900 mb-3 block">Select Report Template</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedTemplate === template.id ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-neutral-50"
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedTemplate === template.id}
                            onCheckedChange={() => setSelectedTemplate(template.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-neutral-900 mb-1">{template.name}</h4>
                            <p className="text-sm text-neutral-600 mb-2">{template.description}</p>
                            <div className="flex items-center justify-between text-xs text-neutral-500">
                              <span>{template.estimatedPages} pages</span>
                              <span>{template.generationTime}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Advanced Options */}
              {selectedTemplateData && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-900 mb-2 block">Report Format</label>
                    <Select
                      value={reportFormat}
                      onValueChange={(v) => setReportFormat(v as "pdf" | "docx" | "excel")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">
                          <div className="flex items-center gap-2">
                            <FileType className="h-4 w-4" />
                            PDF Document
                          </div>
                        </SelectItem>
                        <SelectItem value="docx" disabled>
                          Word Document (coming soon)
                        </SelectItem>
                        <SelectItem value="excel" disabled>
                          Excel Spreadsheet (coming soon)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="certification"
                      checked={includeCertification}
                      onCheckedChange={(v) => setIncludeCertification(Boolean(v))}
                    />
                    <label htmlFor="certification" className="text-sm font-medium text-neutral-900">
                      Include compliance certification pages
                    </label>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-neutral-900 mb-2 block">Framework Coverage</label>
                    <div className="flex gap-2 flex-wrap">
                      {selectedTemplateData.frameworks.map((framework) => (
                        <Badge key={framework} variant="outline">
                          {framework}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-neutral-900 mb-2 block">Report Sections</label>
                    <div className="space-y-2">
                      {selectedTemplateData.sections.map((section) => (
                        <div key={section} className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedSections.includes(section)}
                            onCheckedChange={() => toggleSection(section)}
                          />
                          <span className="text-sm text-neutral-800">{section}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {reportFormat !== "pdf" && (
                    <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      Only PDF generation is supported right now.
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={() => generateReportMutation.mutate()}
                disabled={!selectedTemplateData || generateReportMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {generateReportMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column intentionally empty for now (keeps layout stable) */}
        <div />
      </div>
    </div>
  );
}
