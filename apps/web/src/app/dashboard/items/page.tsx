"use client";

import { type ReactElement } from "react";

import RecordVendorVisitPage from "@/app/dashboard/outlet-visits/visit/page";
import { VendorItemLookup } from "@/components/vendor-item-lookup";
import { useAuthStore } from "@/lib/auth/auth-store";

export default function FieldItemsGivenPage(): ReactElement {
  const role = useAuthStore((state) => state.user?.role);

  if (role === "client") {
    return (
      <div className="flex w-full flex-col gap-6 pb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Items given</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Look up a vendor by her phone number to see which items she has been given.
          </p>
        </div>
        <VendorItemLookup canRecord={false} canManageCatalog={false} />
      </div>
    );
  }

  return <RecordVendorVisitPage />;
}
