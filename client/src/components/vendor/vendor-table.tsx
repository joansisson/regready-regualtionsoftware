import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Cloud,
  Mail,
  BarChart3,
  Check,
  X,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Vendor } from "@shared/schema";

interface VendorTableProps {
  vendors: Vendor[];
  onViewVendor: (vendor: Vendor) => void;
}

const vendorIcons = {
  "Cloud Infrastructure": Cloud,
  "Email Marketing": Mail,
  "Web Analytics": BarChart3,
} as const;

const riskLevelConfig = {
  low: { pill: "bg-emerald-50 text-emerald-800 border-emerald-200", label: "Low" },
  medium: { pill: "bg-amber-50 text-amber-800 border-amber-200", label: "Medium" },
  high: { pill: "bg-rose-50 text-rose-800 border-rose-200", label: "High" },
} as const;

function FrameworkCell({
  compliant,
}: {
  compliant?: boolean | null;
}) {
  if (typeof compliant !== "boolean") {
    return (
      <div className="text-center">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-neutral-200 text-neutral-400 bg-neutral-50">
          —
        </span>
      </div>
    );
  }

  return (
    <div className="text-center">
      {compliant ? (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50">
          <Check className="w-4 h-4" />
        </span>
      ) : (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-rose-200 text-rose-700 bg-rose-50">
          <X className="w-4 h-4" />
        </span>
      )}
    </div>
  );
}

function formatLastAssessment(value?: string | null) {
  if (!value || value.trim().length === 0) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

export default function VendorTable({ vendors, onViewVendor }: VendorTableProps) {
  const [open, setOpen] = useState(false);
  const [activeVendor, setActiveVendor] = useState<Vendor | null>(null);
  const [dpaText, setDpaText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const riskBadge = useMemo(() => {
    return (riskLevel: Vendor["riskLevel"]) => {
      const normalized = String(riskLevel).toLowerCase() as keyof typeof riskLevelConfig;
      const cfg = riskLevelConfig[normalized] ?? riskLevelConfig.medium;
      return cfg;
    };
  }, []);

  const openVendor = (vendor: Vendor) => {
    setActiveVendor(vendor);
    setDpaText(vendor.notes ?? "");
    onViewVendor(vendor);
    setOpen(true);
  };

  const saveDpa = async () => {
    if (!activeVendor) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/vendors/${activeVendor.id}/dpa`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dpaText }),
      });

      if (!res.ok) throw new Error("Failed to save DPA");

      const updated = { ...activeVendor, notes: dpaText };
      setActiveVendor(updated);
      onViewVendor(updated);
    } catch (e) {
      onViewVendor(activeVendor);
    } finally {
      setIsSaving(false);
    }
  };

  const aiRationale = useMemo(() => {
    if (!activeVendor) return null;

    const lowFields = [
      { key: "GDPR", ok: activeVendor.gdprCompliant },
      { key: "SOC 2", ok: activeVendor.soc2Compliant },
      { key: "AI Act", ok: activeVendor.aiActCompliant },
    ];

    const passed = lowFields.filter((f) => f.ok === true).map((f) => f.key);
    const failed = lowFields.filter((f) => f.ok === false).map((f) => f.key);

    const base =
      activeVendor.riskLevel === "low"
        ? "This vendor is currently low risk based on your compliance flags."
        : activeVendor.riskLevel === "medium"
          ? "This vendor is currently medium risk. One or more compliance flags need review."
          : "This vendor is currently high risk. Multiple compliance flags require attention.";

    return {
      base,
      passed,
      failed,
    };
  }, [activeVendor]);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">Vendor & Tool Compliance Status</h3>
            <Button variant="ghost" className="text-primary hover:text-blue-700">
              Manage Vendors
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Vendor/Tool
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  GDPR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  SOC 2
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-neutral-200">
              {vendors.map((vendor) => {
                const Icon = vendorIcons[vendor.type as keyof typeof vendorIcons] || Cloud;
                const cfg = riskBadge(vendor.riskLevel);

                return (
                  <tr key={vendor.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-neutral-200 rounded-lg flex items-center justify-center mr-3">
                          <Icon className="text-neutral-600 w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{vendor.name}</p>
                          <p className="text-xs text-neutral-500">{vendor.type}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={[
                          "inline-flex items-center px-3 py-1.5 rounded-full text-sm border",
                          cfg.pill,
                        ].join(" ")}
                      >
                        {cfg.label}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <FrameworkCell compliant={vendor.gdprCompliant} />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <FrameworkCell compliant={vendor.soc2Compliant} />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {formatLastAssessment(vendor.lastAssessment)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openVendor(vendor)}
                        className="text-primary hover:text-blue-700"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setActiveVendor(null);
            setDpaText("");
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vendor details</DialogTitle>
            <DialogDescription>
              Review why this vendor is flagged and upload the relevant Data Processing Agreement (DPA).
            </DialogDescription>
          </DialogHeader>

          {activeVendor ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-sm text-neutral-500">{activeVendor.type}</div>
                  <div className="text-lg font-bold text-neutral-900">{activeVendor.name}</div>
                </div>

                <span
                  className={[
                    "inline-flex items-center px-3 py-1.5 rounded-full text-sm border",
                    riskBadge(activeVendor.riskLevel).pill,
                  ].join(" ")}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {riskBadge(activeVendor.riskLevel).label}
                </span>
              </div>

              <div className="border rounded-lg p-3 bg-neutral-50">
                <div className="font-semibold text-neutral-900">Why this risk?</div>
                <div className="text-sm text-neutral-700 mt-1">
                  {aiRationale?.base}
                </div>

                <div className="mt-3 text-sm">
                  <div className="font-semibold text-neutral-900">Green flags</div>
                  <div className="text-neutral-700">
                    {aiRationale?.passed?.length ? aiRationale?.passed.join(", ") : "None"}
                  </div>

                  <div className="font-semibold text-neutral-900 mt-3">Needs review</div>
                  <div className="text-neutral-700">
                    {aiRationale?.failed?.length ? aiRationale?.failed.join(", ") : "None"}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-neutral-900">Upload DPA (text)</div>
                <div className="text-sm text-neutral-600">
                  Paste relevant DPA terms or notes. We’ll store it under this vendor’s record.
                </div>
                <Textarea
                  value={dpaText}
                  onChange={(e) => setDpaText(e.target.value)}
                  rows={8}
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDpaText(activeVendor.notes ?? "");
                  }}
                  disabled={isSaving}
                >
                  Reset
                </Button>
                <Button onClick={saveDpa} disabled={isSaving || !dpaText.trim()}>
                  {isSaving ? (
                    <>
                      <LoaderInline /> Saving…
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Save DPA
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-600">No vendor selected.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function LoaderInline() {
  return <span className="inline-block w-4 h-4 rounded-full border-2 border-neutral-900 border-t-transparent animate-spin" />;
}
