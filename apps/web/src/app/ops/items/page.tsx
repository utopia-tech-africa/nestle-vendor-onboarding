"use client";

import { type ReactElement } from "react";

import { VendorItemLookup } from "@/components/vendor-item-lookup";

export default function OpsItemsGivenPage(): ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Items given</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Look up a vendor by phone to see which items she has been given. Manage the catalog of
          umbrellas, tables, posters, and other handouts. Promoters record new items on field visits.
        </p>
      </div>
      <VendorItemLookup canRecord={false} canManageCatalog />
    </div>
  );
}
