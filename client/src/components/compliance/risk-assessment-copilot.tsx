import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

type FrameworkOption = {
  id: number;
  name: string;
  displayName: string;
};

type RiskAnalysisResponse = {
  riskLevel: string;
  riskScore: number;
  recommendations: string[];
  frameworkSpecificRisks: Record<string, string>;
};

export default function RiskAssessmentCopilot() {
  const { toast } = useToast();

  const DEFAULT_FRAMEWORKS = ["GDPR", "SOC 2", "EU AI Act"] as const;

  const [description, setDescription] = useState("");
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([
    ...DEFAULT_FRAMEWORKS,
  ]);

  const { data: frameworks } = useQuery<FrameworkOption[]>({
    queryKey: ["/api/compliance-frameworks"],
  });

  useEffect(() => {
    if (!frameworks || frameworks.length === 0) return;

    const allowed = new Set(frameworks.map((f) => f.displayName));
    setSelectedFrameworks((prev) => {
      const filtered = prev.filter((f) => allowed.has(f));
      if (filtered.length > 0) return filtered;
      return DEFAULT_FRAMEWORKS.filter((f) => allowed.has(f));
    });
  }, [frameworks]);

  const [risk, setRisk] = useState<RiskAnalysisResponse | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/risk-assessments/analyze", {
        description,
        frameworks: selectedFrameworks,
      });
      return (await response.json()) as RiskAnalysisResponse;
    },
    onSuccess: (data) => {
      setRisk(data);
      toast({
        title: "Risk analysis ready",
        description: "Risk level, score, and recommendations were generated.",
      });
    },
    onError: () => {
      toast({
        title: "Risk analysis failed",
        description: "Check your API key in Settings and try again.",
        variant: "destructive",
      });
    },
  });

  const canAnalyze =
    description.trim().length > 0 &&
    selectedFrameworks.length > 0 &&
    !analyzeMutation.isPending;

  const riskBadge = useMemo(() => {
    if (!risk) return null;
    const level = (risk.riskLevel || "").toLowerCase();
    if (level === "critical") return <Badge variant="destructive">{risk.riskLevel}</Badge>;
    if (level === "high") return <Badge variant="secondary">{risk.riskLevel}</Badge>;
    if (level === "medium") return <Badge variant="outline">{risk.riskLevel}</Badge>;
    return <Badge variant="outline">{risk.riskLevel}</Badge>;
  }, [risk]);

  const exportPdfMutation = useMutation({
    mutationFn: async () => {
      if (!risk) return;

      const res = await fetch("/api/risk-assessments/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          frameworks: selectedFrameworks,
          riskLevel: risk.riskLevel,
          riskScore: risk.riskScore,
          recommendations: risk.recommendations,
          frameworkSpecificRisks: risk.frameworkSpecificRisks,
        }),
      });

      if (!res.ok) throw new Error("Failed to export PDF");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `risk-assessment-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    },
    onError: () => {
      toast({
        title: "PDF export failed",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const toggleFramework = (displayName: string) => {
    setSelectedFrameworks((current) => {
      if (current.includes(displayName)) return current.filter((f) => f !== displayName);
      return [...current, displayName];
    });
  };

  return (
    <Card className="border border-orange-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Risk Assessment</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Scenario */}
        <div className="space-y-2">
          <Label htmlFor="risk-desc">Scenario description</Label>
          <Textarea
            id="risk-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example: We are planning to integrate Stripe for payments and store transaction logs in our local SQLite database. Are there any GDPR risks?"
            rows={5}
          />
        </div>

        {/* Frameworks (pills) */}
        <div className="space-y-2">
          <Label>Frameworks</Label>
          <div className="flex flex-wrap gap-2">
            {frameworks?.map((f) => {
              const selected = selectedFrameworks.includes(f.displayName);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFramework(f.displayName)}
                  className={[
                    "inline-flex items-center px-3 py-1.5 rounded-full border text-sm transition-colors",
                    selected
                      ? "bg-blue-600 text-white border-blue-700"
                      : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  {f.displayName}
                </button>
              );
            })}
          </div>
          {frameworks && frameworks.length === 0 && (
            <p className="text-sm text-neutral-600">No frameworks available.</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap items-center">
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={!canAnalyze}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing…
              </>
            ) : (
              "Analyze Risk"
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setRisk(null);
              setDescription("");
              setSelectedFrameworks([...DEFAULT_FRAMEWORKS]);
            }}
            disabled={analyzeMutation.isPending || exportPdfMutation.isPending}
          >
            Clear
          </Button>
        </div>

        {/* Thinking state */}
        {analyzeMutation.isPending && (
          <div className="border rounded-lg p-3 bg-white/40">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking… generating your risk report
            </div>
          </div>
        )}

        {/* Results */}
        {risk && (
          <div className="space-y-3 border rounded-lg p-3 bg-white/40">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <div className="text-sm font-bold text-neutral-900">Overall risk</div>
                <div className="flex items-center gap-2 flex-wrap">{riskBadge}</div>
              </div>

              <div className="min-w-[180px]">
                <div className="text-xs font-bold text-neutral-600 mb-2">
                  Score: {risk.riskScore}/100
                </div>
                <Progress value={Math.min(100, Math.max(0, risk.riskScore))} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => exportPdfMutation.mutate()}
                disabled={exportPdfMutation.isPending}
              >
                {exportPdfMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating PDF…
                  </>
                ) : (
                  "Download PDF"
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-bold text-neutral-900">Recommendations</div>
              {risk.recommendations?.length ? (
                <ul className="list-disc pl-5 text-sm text-neutral-700 space-y-1">
                  {risk.recommendations.map((r, idx) => (
                    <li key={`${idx}-${r}`}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-600">No recommendations returned.</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-bold text-neutral-900">Framework-specific risks</div>
              {risk.frameworkSpecificRisks &&
              Object.keys(risk.frameworkSpecificRisks).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {Object.entries(risk.frameworkSpecificRisks).map(([key, value]) => (
                    <div key={key} className="border rounded-lg p-2 bg-white">
                      <div className="text-xs font-bold text-neutral-900 capitalize">{key}</div>
                      <div className="text-xs text-neutral-700 mt-1 whitespace-pre-wrap">{value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-600">No framework-specific risks returned.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
