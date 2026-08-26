"use client";

import { type ReactElement } from "react";

import { VendorItemLookup } from "@/components/vendor-item-lookup";

export default function OpsItemsGivenPage(): ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Items given</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Look up a vendor by phone number, then tick each item you have given her — umbrellas, tables,
          posters, or anything else the team hands out.
        </p>
      </div>
      <VendorItemLookup canRecord canManageCatalog />
    </div>
  );
}
