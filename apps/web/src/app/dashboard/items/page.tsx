"use client";

import { type ReactElement } from "react";

import { VendorItemLookup } from "@/components/vendor-item-lookup";
import { useAuthStore } from "@/lib/auth/auth-store";

export default function FieldItemsGivenPage(): ReactElement {
  const role = useAuthStore((state) => state.user?.role);
  const canRecord = role !== "client";

  return (
    <div className="flex w-full flex-col gap-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Items given</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Look up a vendor by her phone number
          {canRecord ? ", then tick each item you have given her" : " to see which items she has been given"}
          .
        </p>
      </div>
      <VendorItemLookup canRecord={canRecord} canManageCatalog={false} />
    </div>
  );
}
