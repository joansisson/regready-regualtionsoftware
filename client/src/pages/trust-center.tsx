import { useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, FileText, ArrowLeft } from "lucide-react";
import type { VerifiedLink } from "@shared/schema";

type TrustCenterParams = {
  token?: string;
};

export default function TrustCenter() {
  const params = useParams<TrustCenterParams>();
  const [, setLocation] = useLocation();

  const token = params.token ?? "";

  const queryKey = useMemo(() => ["/api/trust-center", token], [token]);

  const { data, isLoading, error } = useQuery<VerifiedLink>({
    queryKey,
    enabled: Boolean(token),
    queryFn: async () => {
      const res = await fetch(`/api/trust-center/${token}`, { credentials: "include" });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(text);
      }
      return (await res.json()) as VerifiedLink;
    },
  });

  const backToApp = () => {
    setLocation("/landing");
  };

  return (
    <div className="min-h-screen bg-[#FCF7EF] text-slate-900">
      <div className="border-b border-orange-100 bg-white/60 backdrop-blur-md px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-orange-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 leading-tight">
                RegReady Trust Center
              </div>
              <div className="text-sm text-slate-600 font-medium">
                Supplier verification • read-only
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={backToApp}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <Card className="shadow-sm border border-neutral-200 bg-white/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-700" />
              Supplier: {data?.supplierName ?? "—"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {isLoading && (
              <div className="text-sm text-neutral-600">
                Loading trust center details…
              </div>
            )}

            {!isLoading && error && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50">
                <AlertTriangle className="w-5 h-5 text-red-700 mt-0.5" />
                <div>
                  <div className="font-bold text-red-800">Trust Center link not found</div>
                  <div className="text-sm text-red-700 mt-1">
                    The universal link token is invalid or expired.
                  </div>
                </div>
              </div>
            )}

            {!isLoading && data && (
              <>
                <div className="flex flex-wrap gap-2">
                  {data.supplierDomain && (
                    <Badge variant="outline">{data.supplierDomain}</Badge>
                  )}
                  {data.industry && (
                    <Badge variant="secondary">Industry: {data.industry}</Badge>
                  )}
                  {data.companySize && (
                    <Badge variant="secondary">Size: {data.companySize}</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-neutral-900">Verified badges</div>
                  {Array.isArray(data.badges) && data.badges.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {data.badges.map((b, idx) => (
                        <Badge key={`${b}-${idx}`} variant="outline">
                          {b}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-neutral-600">
                      No badges attached to this link.
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <div className="font-bold text-neutral-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-neutral-600" />
                    Verified documents
                  </div>

                  {Array.isArray(data.documents) && data.documents.length > 0 ? (
                    <ul className="space-y-2">
                      {data.documents.map((doc, idx) => (
                        <li
                          key={`${doc.title}-${idx}`}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg border border-neutral-200 bg-white/70"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-neutral-900 truncate">
                              {doc.title}
                            </div>
                            {doc.url ? (
                              <div className="text-xs text-neutral-600 break-all">
                                {doc.url}
                              </div>
                            ) : (
                              <div className="text-xs text-neutral-600">
                                No external URL provided
                              </div>
                            )}
                          </div>

                          {doc.url ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.open(doc.url, "_blank", "noopener,noreferrer")
                              }
                            >
                              Open
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled>
                              Open
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-neutral-600">
                      No documents attached to this link.
                    </div>
                  )}
                </div>

                <div className="text-xs text-neutral-500 pt-2">
                  Created: {new Date(data.createdAt).toLocaleString()}
                  {data.expiresAt
                    ? ` • Expires: ${new Date(data.expiresAt).toLocaleString()}`
                    : ""}
                </div>
              </>
            )}

            {!isLoading && !error && !data && (
              <div className="text-sm text-neutral-600">
                No trust center data returned.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-neutral-200 bg-white/60 backdrop-blur">
          <CardHeader>
            <CardTitle>Read-only transparency</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-700 space-y-2">
            <p>
              This page displays verified compliance badges and documents associated with
              the universal link token. It is intentionally read-only to help buyers
              review evidence quickly.
            </p>
            <p className="text-xs text-neutral-500">
              Implementation note: Phase 2 can connect this trust center to an external
              unified procurement/ERP integration platform for automated updates.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
