import { FormEvent, useMemo, useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  Building2,
  Bot,
  Users,
  Wrench,
  Cloud,
  KeyRound,
  Code,
  Briefcase,
  MessagesSquare,
  Laptop,
  Shield,
} from "lucide-react";
import type {
  WorkspaceProfile,
  WorkspaceAuditBoundary,
  WorkspaceAccessControl,
  WorkspaceEvidencePipeline,
  WorkspaceInfrastructureDetail,
} from "@/lib/auth";
import { getStoredWorkspaceProfile, isWorkspaceProfileComplete, setStoredWorkspaceProfile } from "@/lib/auth";
import TechTile from "@/components/workspace/tech-tile";
import ComplianceQuestionnaire, {
  type ComplianceQuestionnaireState,
} from "@/components/compliance/compliance-questionnaire";

const FRAMEWORK_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "gdpr", label: "GDPR" },
  { key: "soc2", label: "SOC2" },
  { key: "eu-ai-act", label: "EU AI Act" },
];

type VendorOption = { value: string; label: string };

const TECH_ICON_SLUG_BY_VALUE: Record<string, string> = {
  // Cloud Infrastructure
  AWS: "amazonaws",
  Azure: "azure",
  "Google Cloud": "googlecloud",
  Heroku: "heroku",
  DigitalOcean: "digitalocean",
  Kubernetes: "kubernetes",
  Docker: "docker",

  // IAM
  Okta: "okta",
  "Google Workspace": "googlegmail",
  OneLogin: "onelogin",
  Auth0: "auth0",
  SAML: "saml",
  SCIM: "scim",

  // Code & Development
  GitHub: "github",
  GitLab: "gitlab",
  Bitbucket: "bitbucket",
  Jenkins: "jenkins",
  CircleCI: "circleci",
  "GitHub Actions": "githubactions",
  Jira: "atlassian",

  // HRIS
  Workday: "workday",
  BambooHR: "bamboohr",
  Rippling: "rippling",
  Gusto: "gusto",
  ADP: "adp",

  // Endpoint Management (MDM)
  Jamf: "jamf",
  Kandji: "kandji",
  "Microsoft Intune": "microsoftintune",
  "CrowdStrike Falcon (Endpoint)": "crowdstrike",
  "BlackBerry UEM": "blackberry",

  // Security & Monitoring
  Datadog: "datadog",
  Snyk: "snyk",
  Splunk: "splunk",
  CrowdStrike: "crowdstrike",
  Wiz: "wiz",
  "Okta Verify": "okta",

  // Communication & Project Management
  Slack: "slack",
  "Microsoft Teams": "microsoftteams",
  Zendesk: "zendesk",
  ServiceNow: "servicenow",
  Asana: "asana",
  Trello: "trello",
  Confluence: "confluence",
};

const TECH_CATEGORIES: Array<{
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  options: VendorOption[];
}> = [
  {
    id: "cloud",
    title: "Cloud Infrastructure (Hosting)",
    icon: <Cloud className="h-4 w-4" />,
    description: "Where does your data live?",
    options: [
      { value: "AWS", label: "AWS" },
      { value: "Azure", label: "Azure" },
      { value: "Google Cloud", label: "Google Cloud" },
      { value: "Heroku", label: "Heroku" },
      { value: "DigitalOcean", label: "DigitalOcean" },
      { value: "Kubernetes", label: "Kubernetes" },
      { value: "Docker", label: "Docker" },
    ],
  },
  {
    id: "iam",
    title: "Identity & Access (IAM)",
    icon: <KeyRound className="h-4 w-4" />,
    description: "How do you manage logins?",
    options: [
      { value: "Okta", label: "Okta" },
      { value: "Google Workspace", label: "Google Workspace" },
      { value: "Azure AD / Entra ID", label: "Azure AD / Entra ID" },
      { value: "OneLogin", label: "OneLogin" },
      { value: "Auth0", label: "Auth0" },
      { value: "LDAP / Active Directory", label: "LDAP / Active Directory" },
      { value: "SAML", label: "SAML" },
      { value: "SCIM", label: "SCIM" },
    ],
  },
  {
    id: "code-dev",
    title: "Code & Development",
    icon: <Code className="h-4 w-4" />,
    description: "Where is your source code stored?",
    options: [
      { value: "GitHub", label: "GitHub" },
      { value: "GitLab", label: "GitLab" },
      { value: "Bitbucket", label: "Bitbucket" },
      { value: "Jenkins", label: "Jenkins" },
      { value: "CircleCI", label: "CircleCI" },
      { value: "GitHub Actions", label: "GitHub Actions" },
      { value: "Atlassian Jira", label: "Jira" },
    ],
  },
  {
    id: "hris",
    title: "Human Resources (HRIS)",
    icon: <Briefcase className="h-4 w-4" />,
    description: "Where is employee data kept?",
    options: [
      { value: "Workday", label: "Workday" },
      { value: "BambooHR", label: "BambooHR" },
      { value: "Rippling", label: "Rippling" },
      { value: "Gusto", label: "Gusto" },
      { value: "BambooHR", label: "BambooHR" },
      { value: "ADP", label: "ADP" },
      { value: "Okta Workforce (HR)", label: "Okta Workforce (HR)" },
    ],
  },
  {
    id: "mdm-endpoints",
    title: "Endpoint Management (MDM)",
    icon: <Laptop className="h-4 w-4" />,
    description: "How do you secure laptops / mobile devices?",
    options: [
      { value: "Jamf", label: "Jamf" },
      { value: "Kandji", label: "Kandji" },
      { value: "Microsoft Intune", label: "Microsoft Intune" },
      { value: "CrowdStrike Falcon (Endpoint)", label: "CrowdStrike Falcon" },
      { value: "BlackBerry UEM", label: "BlackBerry UEM" },
      { value: "Protectimus / ZTNA (MDM-ish)", label: "ZTNA / Device Access" },
    ],
  },
  {
    id: "security-monitoring",
    title: "Security & Monitoring",
    icon: <MessagesSquare className="h-4 w-4" />,
    description: "What tools watch for threats?",
    options: [
      { value: "Datadog", label: "Datadog" },
      { value: "Snyk", label: "Snyk" },
      { value: "Splunk", label: "Splunk" },
      { value: "CrowdStrike", label: "CrowdStrike" },
      { value: "Wiz", label: "Wiz" },
      { value: "Sentinel / Microsoft Security", label: "Microsoft Sentinel" },
      { value: "Okta Verify", label: "Okta Verify" },
      { value: "SIEM (Generic)", label: "SIEM (Generic)" },
    ],
  },
  {
    id: "comms-pm",
    title: "Communication & Project Management",
    icon: <Cloud className="h-4 w-4" />,
    description: "Where do internal teams collaborate?",
    options: [
      { value: "Slack", label: "Slack" },
      { value: "Microsoft Teams", label: "Microsoft Teams" },
      { value: "Jira", label: "Jira" },
      { value: "Zendesk", label: "Zendesk" },
      { value: "ServiceNow", label: "ServiceNow" },
      { value: "Asana", label: "Asana" },
      { value: "Trello", label: "Trello" },
      { value: "Confluence", label: "Confluence" },
    ],
  },
];

function OptionButtons({
  value,
  options,
  onSelect,
}: {
  value?: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Button
            key={opt.value}
            type="button"
            variant={active ? "default" : "outline"}
            onClick={() => onSelect(opt.value)}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}

function mapExistingToQuestionnaire(existing: WorkspaceProfile | null): ComplianceQuestionnaireState {
  const auditBoundary = existing?.proTipAnswers?.auditBoundary;
  const accessControl = existing?.proTipAnswers?.accessControl;

  const dataProfile =
    auditBoundary?.handlesPIIorPHI === undefined
      ? undefined
      : auditBoundary.handlesPIIorPHI === "none"
        ? "standard-security"
        : "high-security";

  const auditBoundaryEnv =
    auditBoundary?.hasPhysicalOffices === undefined
      ? undefined
      : auditBoundary.hasPhysicalOffices
        ? "physical"
        : "remote";

  const timeToRevokeTarget = accessControl?.timeToRevokeOffboarding as
    | ComplianceQuestionnaireState["timeToRevokeTarget"]
    | undefined;

  const identityStrategy =
    accessControl?.authMethod === undefined
      ? undefined
      : accessControl.authMethod === "sso"
        ? "sso"
        : accessControl.authMethod === "password-manager"
          ? "password-manager"
          : accessControl.authMethod === "both"
            ? "both"
            : undefined;

  return {
    dataProfile,
    auditBoundaryEnv,
    timeToRevokeTarget,
    customTimeToRevoke: accessControl?.customTimeToRevoke ?? "",
    identityStrategy,
  };
}

export default function SetupWizardPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const existing = getStoredWorkspaceProfile();

  const [legalName, setLegalName] = useState(existing?.legalName ?? "");
  const [industry, setIndustry] = useState(existing?.industry ?? "");
  const [companySize, setCompanySize] = useState(existing?.companySize ?? "");
  const [headquarters, setHeadquarters] = useState(existing?.headquarters ?? "");

  const [targetFrameworkKeys, setTargetFrameworkKeys] = useState<string[]>(
    existing?.targetFrameworks?.length ? existing.targetFrameworks : ["gdpr"],
  );

  const [selectedTechStack, setSelectedTechStack] = useState<string[]>(existing?.techStack ?? []);

  const [pocName, setPocName] = useState(existing?.pointOfContact?.name ?? "");
  const [pocRole, setPocRole] = useState(existing?.pointOfContact?.role ?? "");
  const [pocEmail, setPocEmail] = useState(existing?.pointOfContact?.email ?? "");

  const [questionnaire, setQuestionnaire] = useState<ComplianceQuestionnaireState>(() =>
    mapExistingToQuestionnaire(existing),
  );

  // Optional: evidence + infrastructure detail (kept from the previous pro-tip card)
  const [primaryTicketingSystem, setPrimaryTicketingSystem] = useState<WorkspaceEvidencePipeline["primaryTicketingSystem"]>(
    existing?.proTipAnswers?.evidencePipeline?.primaryTicketingSystem,
  );
  const [whereSystemLogsAreCentralized, setWhereSystemLogsAreCentralized] = useState<
    WorkspaceEvidencePipeline["whereSystemLogsAreCentralized"]
  >(existing?.proTipAnswers?.evidencePipeline?.whereSystemLogsAreCentralized);

  const [usesInfrastructureAsCode, setUsesInfrastructureAsCode] = useState<
    WorkspaceInfrastructureDetail["usesInfrastructureAsCode"]
  >(existing?.proTipAnswers?.infrastructureDetail?.usesInfrastructureAsCode);
  const [dataRetentionPolicyDuration, setDataRetentionPolicyDuration] = useState<
    WorkspaceInfrastructureDetail["dataRetentionPolicyDuration"]
  >(existing?.proTipAnswers?.infrastructureDetail?.dataRetentionPolicyDuration);

  const toggleFramework = (key: string) => {
    setTargetFrameworkKeys((current) => {
      const has = current.includes(key);
      const next = has ? current.filter((k) => k !== key) : [...current, key];
      return next.length ? next : current;
    });
  };

  const toggleTech = (value: string) => {
    setSelectedTechStack((current) => {
      const has = current.includes(value);
      return has ? current.filter((v) => v !== value) : [...current, value];
    });
  };

  const canSave = useMemo(() => {
    const profileDraft: WorkspaceProfile = {
      legalName: legalName.trim(),
      industry: industry.trim(),
      companySize: companySize.trim() ? companySize.trim() : undefined,
      headquarters: headquarters.trim(),
      targetFrameworks: targetFrameworkKeys,
      techStack: selectedTechStack,
      pointOfContact: {
        name: pocName.trim(),
        role: pocRole.trim(),
        email: pocEmail.trim() ? pocEmail.trim() : undefined,
      },
      proTipAnswers: undefined,
    };

    // Keep button enabled/disabled perfectly aligned with what the app/router considers "complete".
    return isWorkspaceProfileComplete(profileDraft);
  }, [companySize, headquarters, industry, legalName, pocEmail, pocName, pocRole, selectedTechStack, targetFrameworkKeys]);

  const handleCompleteSetup = () => {
    // Map questionnaire -> backend proTipAnswers shape.
    const auditBoundary: WorkspaceAuditBoundary = {
      handlesPIIorPHI:
        questionnaire.dataProfile === "high-security"
          ? "both"
          : questionnaire.dataProfile === "standard-security"
            ? "none"
            : undefined,

      hasPhysicalOffices:
        questionnaire.auditBoundaryEnv === "remote"
          ? false
          : questionnaire.auditBoundaryEnv === "physical" || questionnaire.auditBoundaryEnv === "hybrid"
            ? true
            : undefined,
    };

    const accessControl: WorkspaceAccessControl = {
      timeToRevokeOffboarding: questionnaire.timeToRevokeTarget,
      customTimeToRevoke:
        questionnaire.timeToRevokeTarget === "custom"
          ? questionnaire.customTimeToRevoke.trim() || undefined
          : undefined,

      authMethod:
        questionnaire.identityStrategy === "sso"
          ? "sso"
          : questionnaire.identityStrategy === "password-manager"
            ? "password-manager"
            : questionnaire.identityStrategy === "both"
              ? "both"
              : undefined,
    };

    const evidencePipeline: WorkspaceEvidencePipeline = {
      primaryTicketingSystem,
      whereSystemLogsAreCentralized,
    };

    const infrastructureDetail: WorkspaceInfrastructureDetail = {
      usesInfrastructureAsCode,
      dataRetentionPolicyDuration,
    };

    const hasAuditBoundary = auditBoundary.handlesPIIorPHI !== undefined || auditBoundary.hasPhysicalOffices !== undefined;
    const hasEvidencePipeline =
      evidencePipeline.primaryTicketingSystem !== undefined || evidencePipeline.whereSystemLogsAreCentralized !== undefined;
    const hasAccessControl =
      accessControl.timeToRevokeOffboarding !== undefined ||
      accessControl.customTimeToRevoke !== undefined ||
      accessControl.authMethod !== undefined;
    const hasInfrastructureDetail =
      infrastructureDetail.usesInfrastructureAsCode !== undefined || infrastructureDetail.dataRetentionPolicyDuration !== undefined;

    const proTipAnswers =
      hasAuditBoundary || hasEvidencePipeline || hasAccessControl || hasInfrastructureDetail
        ? {
            auditBoundary: hasAuditBoundary ? auditBoundary : undefined,
            evidencePipeline: hasEvidencePipeline ? evidencePipeline : undefined,
            accessControl: hasAccessControl ? accessControl : undefined,
            infrastructureDetail: hasInfrastructureDetail ? infrastructureDetail : undefined,
          }
        : undefined;

    const profile: WorkspaceProfile = {
      legalName: legalName.trim(),
      industry: industry.trim(),
      companySize: companySize.trim() ? companySize.trim() : undefined,
      headquarters: headquarters.trim(),
      targetFrameworks: targetFrameworkKeys,
      techStack: selectedTechStack,
      pointOfContact: {
        name: pocName.trim(),
        role: pocRole.trim(),
        email: pocEmail.trim() ? pocEmail.trim() : undefined,
      },
      proTipAnswers,
    };

    if (!isWorkspaceProfileComplete(profile)) {
      toast({
        title: "Missing required workspace info",
        description: "Complete required fields (company profile, frameworks, tech stack, point of contact).",
        variant: "destructive",
      });
      return;
    }

    const selectedVendors = selectedTechStack;

    // Payload for eventual Express + SQLite persistence (TODO: POST when endpoint exists).
    const payload = {
      workspaceProfile: profile,
      selectedVendors,
      complianceQuestionnaire: questionnaire,
      proTipAnswers,
    };

    // For now: persist to localStorage so Fix It can generate grounded remediation.
    setStoredWorkspaceProfile(profile);

    // Make the App immediately react to completion (avoid stale localStorage reads)
    window.dispatchEvent(new Event("regready-workspace-profile-updated"));

    toast({
      title: "Setup complete",
      description: "Saved. Fix It will use your tech stack + questionnaire for grounded remediation.",
    });

    setLocation("/dashboard");

    // TODO: implement backend persistence once `/api/workspace-setup` (or equivalent) exists.
    // await fetch("/api/workspace-setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    return;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleCompleteSetup();
  };

  const reset = () => {
    if (existing) {
      setLegalName(existing.legalName);
      setIndustry(existing.industry);
      setCompanySize(existing.companySize ?? "");
      setHeadquarters(existing.headquarters);
      setTargetFrameworkKeys(existing.targetFrameworks);
      setSelectedTechStack(existing.techStack);
      setPocName(existing.pointOfContact.name);
      setPocRole(existing.pointOfContact.role);
      setPocEmail(existing.pointOfContact.email ?? "");

      setQuestionnaire(mapExistingToQuestionnaire(existing));

      setPrimaryTicketingSystem(existing.proTipAnswers?.evidencePipeline?.primaryTicketingSystem);
      setWhereSystemLogsAreCentralized(existing.proTipAnswers?.evidencePipeline?.whereSystemLogsAreCentralized);
      setUsesInfrastructureAsCode(existing.proTipAnswers?.infrastructureDetail?.usesInfrastructureAsCode);
      setDataRetentionPolicyDuration(existing.proTipAnswers?.infrastructureDetail?.dataRetentionPolicyDuration);
      return;
    }

    setLegalName("");
    setIndustry("");
    setCompanySize("");
    setHeadquarters("");
    setTargetFrameworkKeys(["gdpr"]);
    setSelectedTechStack([]);
    setPocName("");
    setPocRole("");
    setPocEmail("");

    setQuestionnaire({
      dataProfile: undefined,
      auditBoundaryEnv: undefined,
      timeToRevokeTarget: undefined,
      customTimeToRevoke: "",
      identityStrategy: undefined,
    });

    setPrimaryTicketingSystem(undefined);
    setWhereSystemLogsAreCentralized(undefined);
    setUsesInfrastructureAsCode(undefined);
    setDataRetentionPolicyDuration(undefined);
  };

  return (
    <>
      <Header
        title="Setup Wizard"
        description="Provide your organization context so RegReady can generate accurate, tool-specific remediation plans."
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Alert className="border-orange-100 bg-white/60">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <AlertTitle>Grounded remediation</AlertTitle>
            <AlertDescription>
              Fix It needs your tech stack inventory. Select the vendors/tools you actually use so recommendations
              become “do-this-right-now” guidance (not generic advice).
            </AlertDescription>
          </Alert>

          {/* Company profile */}
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Company profile (Who)
              </CardTitle>
              <CardDescription>These fields help prioritize requirements and tailor guidance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="legalName">Legal name *</Label>
                  <Input id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Acme Supply Co." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry *</Label>
                  <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="FinTech, Healthcare, SaaS…" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company size (optional)</Label>
                  <Input id="companySize" value={companySize} onChange={(e) => setCompanySize(e.target.value)} placeholder="50-200 employees" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hq">Headquarters *</Label>
                  <Input id="hq" value={headquarters} onChange={(e) => setHeadquarters(e.target.value)} placeholder="Austin, TX (or country/region)" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Target frameworks */}
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Target frameworks (Goal)
              </CardTitle>
              <CardDescription>Select the certifications/regulations you want RegReady to optimize for.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {FRAMEWORK_OPTIONS.map((opt) => {
                  const active = targetFrameworkKeys.includes(opt.key);
                  return (
                    <Button
                      key={opt.key}
                      type="button"
                      variant={active ? "default" : "outline"}
                      onClick={() => toggleFramework(opt.key)}
                    >
                      {opt.label}
                    </Button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                {targetFrameworkKeys.map((k) => {
                  const label = FRAMEWORK_OPTIONS.find((o) => o.key === k)?.label ?? k;
                  return (
                    <Badge key={k} variant="secondary">
                      {label}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Tech stack tiles */}
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                Tech stack inventory (Environment)
              </CardTitle>
              <CardDescription>
                Tile-select the vendors/tools you use. These values get injected into Auto‑Remediation prompts.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {TECH_CATEGORIES.map((cat) => (
                <div key={cat.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {cat.icon}
                      <div className="font-bold text-neutral-900">{cat.title}</div>
                    </div>
                    <div className="text-xs text-neutral-500">{cat.description}</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {cat.options.map((opt) => (
                      <TechTile
                        key={opt.value}
                        name={opt.label}
                        isSelected={selectedTechStack.includes(opt.value)}
                        iconSlug={TECH_ICON_SLUG_BY_VALUE[opt.value]}
                        onToggle={() => toggleTech(opt.value)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {selectedTechStack.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected tech stack (saved)</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTechStack.map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2 - Compliance Questionnaire */}
          <ComplianceQuestionnaire value={questionnaire} onChange={setQuestionnaire} />

          {/* Optional: evidence + infrastructure */}
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Optional: Evidence & infrastructure detail
              </CardTitle>
              <CardDescription>
                These answers help RegReady produce more precise, auditor-ready remediation steps.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="font-bold text-neutral-900">1) Evidence pipeline</div>

                <div className="space-y-2">
                  <Label htmlFor="ticketingSystem">Primary ticketing system for code changes & access requests</Label>
                  <Input
                    id="ticketingSystem"
                    value={primaryTicketingSystem ?? ""}
                    onChange={(e) => setPrimaryTicketingSystem(e.target.value ? e.target.value : undefined)}
                    placeholder="Jira, GitHub Issues, Linear…"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logCentralization">Where are your system logs currently centralized?</Label>
                  <Input
                    id="logCentralization"
                    value={whereSystemLogsAreCentralized ?? ""}
                    onChange={(e) => setWhereSystemLogsAreCentralized(e.target.value ? e.target.value : undefined)}
                    placeholder="Datadog, AWS CloudWatch, Splunk…"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="font-bold text-neutral-900">2) Infrastructure detail</div>

                <div className="space-y-2">
                  <Label>Do you use Infrastructure as Code (Terraform, CloudFormation)?</Label>
                  <OptionButtons
                    value={typeof usesInfrastructureAsCode === "boolean" ? String(usesInfrastructureAsCode) : undefined}
                    onSelect={(v) => setUsesInfrastructureAsCode(v === "true")}
                    options={[
                      { value: "true", label: "Yes (IaC)" },
                      { value: "false", label: "No / mostly manual" },
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataRetentionDuration">What is your data retention policy duration?</Label>
                  <Input
                    id="dataRetentionDuration"
                    value={dataRetentionPolicyDuration ?? ""}
                    onChange={(e) =>
                      setDataRetentionPolicyDuration(e.target.value ? e.target.value : undefined)
                    }
                    placeholder="e.g., 7 years, until account deletion…"
                  />
                </div>
              </div>

              <div className="text-sm text-neutral-600">
                Tip: you can leave any optional question blank—RegReady will fall back to tech stack + industry context.
              </div>
            </CardContent>
          </Card>

          {/* POC */}
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Compliance point of contact (Sign-off)
              </CardTitle>
              <CardDescription>Who validates and signs off remediation actions?</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pocName">Name *</Label>
                  <Input id="pocName" value={pocName} onChange={(e) => setPocName(e.target.value)} placeholder="Alex Morgan" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pocRole">Role *</Label>
                  <Input id="pocRole" value={pocRole} onChange={(e) => setPocRole(e.target.value)} placeholder="Security Officer / Compliance Manager" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="pocEmail">Email (optional)</Label>
                  <Input id="pocEmail" value={pocEmail} onChange={(e) => setPocEmail(e.target.value)} placeholder="alex@company.com" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="sticky bottom-0 z-10 bg-neutral-50/95 backdrop-blur border-t border-orange-100 pt-4">
            <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap justify-end">
              <Button type="button" variant="outline" onClick={() => reset()}>
                Reset
              </Button>

              <Button type="submit" className={!canSave ? "opacity-70" : undefined}>
                Complete setup
              </Button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
