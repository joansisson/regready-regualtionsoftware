import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import VendorTable from "@/components/vendor/vendor-table";
import type { Vendor } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function VendorManagement() {
  const { toast } = useToast();

  const { data: vendorsData, isLoading, error } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const vendors = useMemo(() => (Array.isArray(vendorsData) ? vendorsData : []), [vendorsData]);

  return (
    <>
      <Header
        title="Vendor Management"
        description="Track third-party tools and their compliance posture"
      />

      <main className="flex-1 overflow-y-auto p-6">
        {isLoading && <div className="text-neutral-600">Loading vendors...</div>}

        {!isLoading && error && (
          <div className="text-red-600">
            Failed to load vendors: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        )}

        {!isLoading && !error && (
          <VendorTable
            vendors={vendors}
            onViewVendor={(vendor) => {
              toast({
                title: "Vendor selected",
                description: `${vendor.name} • risk: ${vendor.riskLevel}`,
              });
            }}
          />
        )}
      </main>
    </>
  );
}
