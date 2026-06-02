import { CheckCircle2, Shield, Building2, Clock3, KeyRound } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export type DataProfileValue = "high-security" | "standard-security" | undefined;
export type AuditBoundaryEnvValue = "remote" | "physical" | "hybrid" | undefined;
export type TimeToRevokeTargetValue = "same-day" | "24-hours" | "48-hours" | "custom" | undefined;
export type IdentityStrategyValue = "sso" | "password-manager" | "both" | undefined;

export type ComplianceQuestionnaireState = {
  dataProfile: DataProfileValue;
  auditBoundaryEnv: AuditBoundaryEnvValue;
  timeToRevokeTarget: TimeToRevokeTargetValue;
  customTimeToRevoke: string;
  identityStrategy: IdentityStrategyValue;
};

type ComplianceQuestionnaireProps = {
  value: ComplianceQuestionnaireState;
  onChange: (next: ComplianceQuestionnaireState) => void;
  className?: string;
};

function ChoiceCard({
  selected,
  icon,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn(
        "h-auto w-full rounded-xl border bg-white p-4 text-left transition-all",
        "hover:shadow-sm hover:border-primary/50",
        selected
          ? "border-primary/80 ring-2 ring-primary/20 bg-primary/5"
          : "border-neutral-200",
      )}
    >
      <span className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border",
            selected ? "border-primary/30 bg-primary/10 text-primary" : "border-neutral-200 bg-neutral-50 text-neutral-800",
          )}
        >
          {icon}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold text-neutral-900">{title}</span>
            {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
          </span>

          {description ? <span className="mt-1 block text-sm text-neutral-600">{description}</span> : null}
        </span>
      </span>
    </Button>
  );
}

export default function ComplianceQuestionnaire({
  value,
  onChange,
  className,
}: ComplianceQuestionnaireProps) {
  return (
    <Card className={cn("border-orange-100 bg-white/60 backdrop-blur", className)}>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Compliance Questionnaire (Step 2)
        </CardTitle>
        <CardDescription>
          Answer these for auditor-grade “golden thread” context. Missing details won’t block setup.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* 1) Data Profile */}
        <section className="space-y-3">
          <div className="space-y-1">
            <div className="font-bold text-neutral-900">1) Data Profile</div>
            <div className="text-sm text-neutral-600">Does your product handle PII (Personally Identifiable Information) or PHI (Protected Health Information)?</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ChoiceCard
              selected={value.dataProfile === "high-security"}
              icon={<Shield className="h-4 w-4" />}
              title="Yes (High Security)"
              description="We’ll assume stronger privacy & access controls."
              onClick={() => onChange({ ...value, dataProfile: "high-security" })}
            />
            <ChoiceCard
              selected={value.dataProfile === "standard-security"}
              icon={<Shield className="h-4 w-4" />}
              title="No (Standard Security)"
              description="We’ll optimize for baseline controls."
              onClick={() => onChange({ ...value, dataProfile: "standard-security" })}
            />
          </div>
        </section>

        {/* 2) Audit Boundary */}
        <section className="space-y-3">
          <div className="space-y-1">
            <div className="font-bold text-neutral-900">2) Audit Boundary</div>
            <div className="text-sm text-neutral-600">What is your primary workspace environment?</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ChoiceCard
              selected={value.auditBoundaryEnv === "remote"}
              icon={<Building2 className="h-4 w-4" />}
              title="100% Remote"
              description="Employees primarily work offsite."
              onClick={() => onChange({ ...value, auditBoundaryEnv: "remote" })}
            />
            <ChoiceCard
              selected={value.auditBoundaryEnv === "physical"}
              icon={<Building2 className="h-4 w-4" />}
              title="Physical Office"
              description="Primary operations in a physical location."
              onClick={() => onChange({ ...value, auditBoundaryEnv: "physical" })}
            />
            <ChoiceCard
              selected={value.auditBoundaryEnv === "hybrid"}
              icon={<Building2 className="h-4 w-4" />}
              title="Hybrid"
              description="A mix of remote and onsite work."
              onClick={() => onChange({ ...value, auditBoundaryEnv: "hybrid" })}
            />
          </div>
        </section>

        {/* 3) Access Goals */}
        <section className="space-y-3">
          <div className="space-y-1">
            <div className="font-bold text-neutral-900">3) Access Goals</div>
            <div className="text-sm text-neutral-600">
              What is your "Time-to-Revoke" target for offboarding employees?
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <ChoiceCard
              selected={value.timeToRevokeTarget === "same-day"}
              icon={<Clock3 className="h-4 w-4" />}
              title="Same-Day"
              description="Revoke today."
              onClick={() => onChange({ ...value, timeToRevokeTarget: "same-day" })}
            />
            <ChoiceCard
              selected={value.timeToRevokeTarget === "24-hours"}
              icon={<Clock3 className="h-4 w-4" />}
              title="24 Hours"
              description="Revoke within 1 day."
              onClick={() => onChange({ ...value, timeToRevokeTarget: "24-hours" })}
            />
            <ChoiceCard
              selected={value.timeToRevokeTarget === "48-hours"}
              icon={<Clock3 className="h-4 w-4" />}
              title="48 Hours"
              description="Revoke within 2 days."
              onClick={() => onChange({ ...value, timeToRevokeTarget: "48-hours" })}
            />
            <ChoiceCard
              selected={value.timeToRevokeTarget === "custom"}
              icon={<Clock3 className="h-4 w-4" />}
              title="Custom"
              description="Your own target."
              onClick={() => onChange({ ...value, timeToRevokeTarget: "custom" })}
            />
          </div>

          {value.timeToRevokeTarget === "custom" ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <Label htmlFor="customTimeToRevoke">Custom target</Label>
                  <div className="text-sm text-neutral-600">Example: “6 hours”, “72 hours”, “2 business days”.</div>
                </div>
              </div>
              <Input
                id="customTimeToRevoke"
                value={value.customTimeToRevoke}
                onChange={(e) => onChange({ ...value, customTimeToRevoke: e.target.value })}
                placeholder="e.g., 12 hours"
              />
            </div>
          ) : null}
        </section>

        {/* 4) Identity Strategy */}
        <section className="space-y-3">
          <div className="space-y-1">
            <div className="font-bold text-neutral-900">4) Identity Strategy</div>
            <div className="text-sm text-neutral-600">How do you manage primary access?</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ChoiceCard
              selected={value.identityStrategy === "sso"}
              icon={<KeyRound className="h-4 w-4" />}
              title="Centralized SSO (e.g., Okta)"
              description="SSO is the primary access path."
              onClick={() => onChange({ ...value, identityStrategy: "sso" })}
            />
            <ChoiceCard
              selected={value.identityStrategy === "password-manager"}
              icon={<KeyRound className="h-4 w-4" />}
              title="Password Manager (e.g., 1Password)"
              description="Managed passwords are primary."
              onClick={() => onChange({ ...value, identityStrategy: "password-manager" })}
            />
            <ChoiceCard
              selected={value.identityStrategy === "both"}
              icon={<KeyRound className="h-4 w-4" />}
              title="Both"
              description="SSO + managed passwords."
              onClick={() => onChange({ ...value, identityStrategy: "both" })}
            />
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
