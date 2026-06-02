import { useEffect, useState } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, KeyRound, ShieldCheck, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  type LLMProvider,
  getStoredGeminiKey,
  setStoredGeminiKey,
  clearStoredGeminiKey,
} from "@/lib/auth";

interface ApiKeyStatus {
  provider: LLMProvider;
  hasApiKey: boolean;
  last4: string | null;
  validatedAt: string | null;
}

export default function Settings() {
  const { toast } = useToast();

  const provider: LLMProvider = "gemini";

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    provider: LLMProvider;
    last4: string | null;
    validatedAt: string | null;
    message: string;
  } | null>(null);

  // ----------------------------
  // Universal Link / Trust Center
  // ----------------------------
  const [supplierName, setSupplierName] = useState("");
  const [supplierDomain, setSupplierDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [badgesInput, setBadgesInput] = useState("");

  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [token, setToken] = useState("");
  const [trustCenterUrl, setTrustCenterUrl] = useState("");

  const parseBadges = (value: string): string[] => {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  };

  useEffect(() => {
    // Initialize immediately so UI isn't empty.
    const storedKey = getStoredGeminiKey().trim();
    const isGeminiKey = /^AIza[0-9A-Za-z_-]{20,}$/.test(storedKey);
    setApiKey(isGeminiKey ? storedKey : "");

    const loadStatus = async () => {
      try {
        const response = await fetch("/api/user/settings/api-key");
        if (!response.ok) return;

        const data = (await response.json()) as ApiKeyStatus;

        setStatus(data);
      } catch {
        // no-op
      }
    };

    loadStatus();
  }, []);

  const validateKey = async (keyToValidate: string) => {
    setIsValidating(true);
    try {
      const response = await apiRequest("POST", "/api/user/settings/api-key", {
        apiKey: keyToValidate,
        provider,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Validation failed");
      }

      setStatus({
        provider,
        hasApiKey: true,
        last4: result.last4 || keyToValidate.slice(-4),
        validatedAt: new Date().toISOString(),
      });

      toast({
        title: "Gemini key saved",
        description: "Your key was verified and saved successfully.",
      });

      // Notify sidebar to refresh BYOK validation state (event-driven, no polling).
      window.dispatchEvent(new CustomEvent("regready:api-status-updated"));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to validate key.";
      toast({
        title: "Validation failed",
        description: message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API key required",
        description: "Enter your Gemini API key to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const savedLocally = apiKey.trim();
      setStoredGeminiKey(savedLocally);

      const validated = await validateKey(savedLocally);
      if (!validated) return;
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    clearStoredGeminiKey();
    setApiKey("");
    setStatus((currentStatus) =>
      currentStatus
        ? { ...currentStatus, hasApiKey: false, last4: null, validatedAt: null }
        : currentStatus
    );
    setTestStatus(null);
    toast({
      title: "Key removed",
      description: "Your local Gemini key has been cleared.",
    });

    // Notify sidebar to refresh BYOK validation state.
    window.dispatchEvent(new CustomEvent("regready:api-status-updated"));
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API key required",
        description: "Enter your Gemini API key to test.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    setTestStatus(null);

    try {
      const response = await apiRequest("POST", "/api/user/settings/api-key/test", {
        apiKey: apiKey.trim(),
        provider,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Test failed");
      }

      setTestStatus({
        provider,
        last4: result.last4 || apiKey.trim().slice(-4),
        validatedAt: result.validatedAt ?? new Date().toISOString(),
        message: result.message || "Key validated successfully.",
      });

      toast({
        title: "Connection OK",
        description: result.message || "Your key is valid.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to validate key.";
      setTestStatus({
        provider,
        last4: null,
        validatedAt: null,
        message,
      });

      toast({
        title: "Connection failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleGenerateUniversalLink = async () => {
    if (!supplierName.trim()) {
      toast({
        title: "Supplier name required",
        description: "Enter your supplier / organization name.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingLink(true);
    try {
      const response = await fetch("/api/verified-links/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          supplierName: supplierName.trim(),
          supplierDomain: supplierDomain.trim() ? supplierDomain.trim() : undefined,
          industry: industry.trim() ? industry.trim() : undefined,
          companySize: companySize.trim() ? companySize.trim() : undefined,
          badges: parseBadges(badgesInput),
          attachApprovedPolicies: true,
        }),
      });

      if (!response.ok) {
        const text = (await response.text()) || response.statusText;
        throw new Error(text);
      }

      const data = (await response.json()) as {
        token: string;
        trustCenterUrl: string;
      };

      setToken(data.token);
      setTrustCenterUrl(data.trustCenterUrl);

      toast({
        title: "Universal link generated",
        description: "Share the Trust Center link with buyers (read-only).",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate universal link.";
      toast({
        title: "Generation failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyTrustCenter = async () => {
    if (!trustCenterUrl) return;
    try {
      await navigator.clipboard.writeText(trustCenterUrl);
      toast({ title: "Copied", description: "Trust Center link copied to clipboard." });
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard permission denied.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Header title="Settings" description="Manage your activation details and your LLM (BYOK) key." />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Gemini API Key (BYOK)
              </CardTitle>
              <CardDescription>Configure your Gemini key to enable policy generation and risk analysis.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>BYOK mode</AlertTitle>
                <AlertDescription>Your key is stored locally in the browser and validated by the backend before use.</AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="llm-api-key">Gemini API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="llm-api-key"
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIza..."
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800"
                      aria-label={showKey ? "Hide key" : "Show key"}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <p className="text-sm text-neutral-500">
                  Generate your key on{" "}
                  <a
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google AI Studio <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              {status?.hasApiKey && status.provider === provider && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
                  <Badge variant="secondary">Active</Badge>
                  {status.last4 && <span>Last 4: •••• {status.last4}</span>}
                  {status.validatedAt && (
                    <span>Validated: {new Date(status.validatedAt).toLocaleString()}</span>
                  )}
                </div>
              )}

              {testStatus && (
                <div
                  className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  style={
                    testStatus.last4
                      ? { borderColor: "rgb(209 250 229)", background: "rgb(236 253 245)" }
                      : { borderColor: "rgb(254 226 226)", background: "rgb(254 242 242)" }
                  }
                >
                  <Badge variant="secondary">{testStatus.last4 ? "Test OK" : "Test failed"}</Badge>
                  {testStatus.last4 && <span>Last 4: •••• {testStatus.last4}</span>}
                  {testStatus.validatedAt && (
                    <span>Validated: {new Date(testStatus.validatedAt).toLocaleString()}</span>
                  )}
                  <span className="text-neutral-600">• {testStatus.message}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSave} disabled={isSaving || isValidating}>
                  {isSaving || isValidating ? "Saving..." : "Save and Validate"}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || !apiKey.trim()}
                >
                  {isTestingConnection ? "Testing…" : "Test Connection"}
                </Button>

                <Button variant="outline" onClick={handleClear} disabled={!apiKey && !status?.hasApiKey}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                Generate Universal Link (Trust Center)
              </CardTitle>
              <CardDescription>
                Publish a read-only Trust Center for buyers. The link can auto-attach your approved policies as
                verified documents.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="supplierName">Supplier / Organization Name</Label>
                <Input
                  id="supplierName"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g., Acme Supply Co."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplierDomain">Supplier Domain (optional)</Label>
                <Input
                  id="supplierDomain"
                  value={supplierDomain}
                  onChange={(e) => setSupplierDomain(e.target.value)}
                  placeholder="e.g., acme.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry (optional)</Label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g., FinTech, Healthcare, SaaS"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size (optional)</Label>
                  <Input
                    id="companySize"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    placeholder="e.g., 50-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="badges">Verified Badges (optional, comma-separated)</Label>
                <Input
                  id="badges"
                  value={badgesInput}
                  onChange={(e) => setBadgesInput(e.target.value)}
                  placeholder="e.g., SOC 2 Ready, Privacy Certified"
                />
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <Button onClick={handleGenerateUniversalLink} disabled={isGeneratingLink || !supplierName.trim()}>
                  {isGeneratingLink ? "Generating..." : "Generate Universal Link"}
                </Button>

                {trustCenterUrl && (
                  <Button variant="outline" onClick={handleCopyTrustCenter} disabled={isGeneratingLink}>
                    Copy Link
                  </Button>
                )}

                {trustCenterUrl && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setTrustCenterUrl("");
                      setToken("");
                      toast({ title: "Cleared", description: "Universal link output cleared." });
                    }}
                    disabled={isGeneratingLink}
                  >
                    Clear Output
                  </Button>
                )}
              </div>

              {trustCenterUrl && (
                <div className="space-y-2">
                  <Label>Trust Center URL</Label>
                  <Input value={trustCenterUrl} readOnly />
                  <p className="text-xs text-neutral-500">
                    Token: <span className="font-mono">{token}</span>
                  </p>
                </div>
              )}

              <p className="text-xs text-neutral-500 leading-relaxed">
                Your backend will attach approved policies (status: approved/final) as verified documents.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
