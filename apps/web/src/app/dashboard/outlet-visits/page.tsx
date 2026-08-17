"use client";

import { ClipboardCheck, Plus } from "lucide-react";
import Link from "next/link";
import { type ReactElement, useMemo, useState } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmMutedLinkClass, calmPrimaryButtonInlineClass } from "@/lib/calm-ui";

import {
  fieldVendorInputClass,
  fieldVendorPageClass,
  fieldVendorVisitHref
} from "./field-vendor-shared";
import { useFieldVendorOptions } from "./use-field-vendor-options";

export default function FieldVendorsHubPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { vendorOptions, isLoading, isError } = useFieldVendorOptions(accessToken);
  const [search, setSearch] = useState("");

  const filteredVendors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length === 0) return vendorOptions;
    return vendorOptions.filter((vendor) => {
      const hay = [
        vendor.name,
        vendor.contactName,
        vendor.contactPhone,
        vendor.district,
        vendor.locationArea
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [search, vendorOptions]);

  if (accessToken === null) {
    return <BoneyardInlineFallback name="field-vendors-auth" className="min-h-32" />;
  }

  return (
    <div className={fieldVendorPageClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Vendors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a koko vendor or record a visit. Photos are captured when you add a vendor.
          </p>
        </div>
        <Link href="/dashboard/outlet-visits/history" className={calmMutedLinkClass}>
          History
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/outlet-visits/new"
          className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 sm:p-5"
        >
          <Plus className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="block text-sm font-semibold">Add vendor</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Register a new koko vendor with GPS and photos.
            </span>
          </span>
        </Link>
        <Link
          href={fieldVendorVisitHref()}
          className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 sm:p-5"
        >
          <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="block text-sm font-semibold">Record visit</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Questionnaire, visibility, and competitors.
            </span>
          </span>
        </Link>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-sm font-semibold">Your vendors</h2>
          <label className="block min-w-0 text-xs font-medium text-muted-foreground sm:w-72">
            Search
            <input
              className={fieldVendorInputClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, phone, district…"
            />
          </label>
        </div>

        {isLoading ? (
          <BoneyardInlineFallback name="field-vendors-list" className="mt-3 min-h-32" />
        ) : null}
        {isError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            Could not load vendors.
          </p>
        ) : null}
        {!isLoading && !isError && filteredVendors.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {search.trim()
              ? "No vendors match that search."
              : "No vendors yet. Add a vendor to get started."}
          </p>
        ) : null}
        {filteredVendors.length > 0 ? (
          <>
            <ul className="mt-3 divide-y divide-border md:hidden">
              {filteredVendors.map((vendor) => {
                const place = [vendor.district, vendor.locationArea]
                  .filter((part) => part != null && part.trim().length > 0)
                  .join(" · ");
                return (
                  <li key={vendor.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{vendor.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {place.length > 0 ? place : vendor.category}
                      </p>
                    </div>
                    <Link
                      href={fieldVendorVisitHref(vendor.id)}
                      className={`${calmPrimaryButtonInlineClass} min-w-20 px-3 py-2 text-xs`}
                    >
                      Visit
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Business</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">Location</th>
                    <th className="py-2 pr-3 font-medium">Phone</th>
                    <th className="py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => {
                    const place = [vendor.district, vendor.locationArea]
                      .filter((part) => part != null && part.trim().length > 0)
                      .join(" · ");
                    return (
                      <tr key={vendor.id} className="border-b border-border/80 last:border-0">
                        <td className="py-3 pr-3">
                          <p className="font-medium text-foreground">{vendor.name}</p>
                          {vendor.contactName ? (
                            <p className="text-xs text-muted-foreground">{vendor.contactName}</p>
                          ) : null}
                        </td>
                        <td className="py-3 pr-3 text-muted-foreground">{vendor.category}</td>
                        <td className="py-3 pr-3 text-muted-foreground">
                          {place.length > 0 ? place : "—"}
                        </td>
                        <td className="py-3 pr-3 text-muted-foreground">
                          {vendor.contactPhone ?? "—"}
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            href={fieldVendorVisitHref(vendor.id)}
                            className={calmPrimaryButtonInlineClass}
                          >
                            Visit
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
