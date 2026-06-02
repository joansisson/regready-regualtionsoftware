import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getStoredWorkspaceProfile } from "@/lib/auth";
import { ClipboardCopy, Sparkles, Wand2, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

type TechnicalTask = {
  title: string;
  checklist: string[];
};

type RemediationSuggestResponse = {
  diffSummary: string;
  suggestedPolicyPatch: string;
  technicalTasks: TechnicalTask[];
  createdPolicy?: CreatedPolicy;
};

type Vendor = {
  id: number;
  name: string;
  type: string;
  riskLevel: string;
  gdprCompliant: boolean;
  soc2Compliant: boolean;
  aiActCompliant: boolean;
  notes?: string;
};

type AutoRemediationCopilotProps = {
  /**
   * What the user is trying to fix, e.g. "No Data Retention Policy" or "NIST 800-53 AC-2"
   */
  frameworkControl: string;
  /**
   * Optional default policy text to prefill.
   */
  defaultPolicyText?: string;
  /**
   * Optional badge label to show context.
   */
  label?: string;
};

type CreatedPolicy = {
  id: number;
  title: string;
  status: string;
};

export default function AutoRemediationCopilot({
  frameworkControl,
  defaultPolicyText = "",
  label,
}: AutoRemediationCopilotProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [policyText, setPolicyText] = useState(defaultPolicyText);
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");

  useEffect(() => {
    const workspace = getStoredWorkspaceProfile();
    if (!workspace) return;

    setIndustry(workspace.industry ?? "");
    setCompanySize(workspace.companySize ?? "");
  }, []);

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const techStack = useMemo(() => {
    if (Array.isArray(vendors) && vendors.length > 0) {
      return vendors.map((v) => v.name);
    }

    const workspace = getStoredWorkspaceProfile();
    return workspace?.techStack ?? [];
  }, [vendors]);

  const suggestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/remediation/suggest", {
        frameworkControl,
        policyText,
        industry: industry.trim() ? industry.trim() : undefined,
        companySize: companySize.trim() ? companySize.trim() : undefined,
        techStack,

        // Persist suggestion into the policy pipeline immediately.
        persistPolicy: true,
        targetStatus: "under-review",
        policyTitle: `Remediation — ${frameworkControl}`.slice(0, 120),
      });
      return (await response.json()) as RemediationSuggestResponse;
    },
    onSuccess: (data) => {
      toast({
        title: data.createdPolicy ? "Remediation submitted" : "Remediation drafted",
        description: data.createdPolicy
          ? `Created: ${data.createdPolicy.title} (${data.createdPolicy.status}).`
          : "A suggested policy patch and technical action plan are ready.",
      });

      // Refresh buckets in the Policy Management dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });

      setDraft(data);
    },
        onError: () => {
      toast({
        title: "Draft failed",
        description: "Could not generate remediation. Check your Gemini key in Settings.",
        variant: "destructive",
      });
    },
  });

  const [draft, setDraft] = useState<RemediationSuggestResponse | null>(null);

  const canDraft = useMemo(() => {
    return frameworkControl.trim().length > 0 && policyText.trim().length > 0 && !suggestMutation.isPending;
  }, [frameworkControl, policyText, suggestMutation.isPending]);

  const copyDraft = async () => {
    if (!draft?.suggestedPolicyPatch) return;
    try {
      await navigator.clipboard.writeText(draft.suggestedPolicyPatch);
      toast({ title: "Copied", description: "Suggested policy patch copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard permission denied.", variant: "destructive" });
    }
  };

  const reset = () => {
    const workspace = getStoredWorkspaceProfile();
    setDraft(null);
    setPolicyText(defaultPolicyText);
    setIndustry(workspace?.industry ?? "");
    setCompanySize(workspace?.companySize ?? "");
  };

  const badgeLabel = label ?? "Fix It";

  return (
      <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Wand2 className="h-4 w-4 mr-2" />
          {badgeLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Auto‑Remediation Co‑Pilot</DialogTitle>
          <DialogDescription>
            Draft a tailored policy patch and an implementation-ready checklist for:
            <span className="font-bold text-neutral-900"> {frameworkControl}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Step 1 — Context & current policy text</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry (optional)</Label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g., Healthcare, FinTech, SaaS"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company size (optional)</Label>
                  <Input
                    id="companySize"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    placeholder="e.g., 50-200 employees"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tech stack signals</Label>
                <div className="flex flex-wrap gap-2">
                  {techStack.length === 0 ? (
                    <Badge variant="secondary">No vendors configured yet</Badge>
                  ) : (
                    techStack.map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="policyText">Step 2 — Current policy text</Label>
                <Textarea
                  id="policyText"
                  value={policyText}
                  onChange={(e) => setPolicyText(e.target.value)}
                  placeholder="Paste the current policy section (or the best available draft)."
                  rows={7}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => suggestMutation.mutate()}
                  disabled={!canDraft}
                  className="flex-1"
                >
                  {suggestMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Drafting…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Fix It Plan
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    reset();
                    toast({ title: "Cleared", description: "Input cleared." });
                  }}
                  disabled={suggestMutation.isPending}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {draft && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Step 3 — Draft output</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-700" />
                    <h3 className="font-bold text-neutral-900">Diff summary</h3>
                  </div>
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">{draft.diffSummary}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-700" />
                    <h3 className="font-bold text-neutral-900">Suggested policy patch</h3>
                  </div>
                  <Textarea value={draft.suggestedPolicyPatch} readOnly rows={8} />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={copyDraft}>
                      <ClipboardCopy className="h-4 w-4 mr-2" />
                      Copy patch
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: "Action checklist ready",
                          description: "Use the technical tasks below as your implementation runbook.",
                        });
                      }}
                    >
                      View checklist
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-neutral-900">Technical tasks</h3>
                  {draft.technicalTasks.length === 0 ? (
                    <p className="text-sm text-neutral-600">No technical tasks returned by the model.</p>
                  ) : (
                    <div className="space-y-3">
                      {draft.technicalTasks.map((task, idx) => (
                        <div key={`${task.title}-${idx}`} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-neutral-900">{task.title}</p>
                            <Badge variant="secondary">{task.checklist.length} steps</Badge>
                          </div>
                          <ul className="mt-2 space-y-1 text-sm text-neutral-700">
                            {task.checklist.map((step, stepIdx) => (
                              <li key={`${step}-${stepIdx}`} className="flex gap-2">
                                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-neutral-400 flex-shrink-0" />
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setOpen(false)}>Done</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
