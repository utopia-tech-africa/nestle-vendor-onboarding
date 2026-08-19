"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactElement, useMemo, useState } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { ListPagination } from "@/components/list-pagination";
import { outletMapsUrl } from "@/components/outlet-map-preview";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { VendorAvatar, VendorPhotoGallery } from "@/components/vendor-photos";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmMutedLinkClass } from "@/lib/calm-ui";
import {
  formatPageRangeLabel,
  listOutlets,
  listPromoters,
  promoterOptionLabel
} from "@/lib/outlet/outlet-api";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";
const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const SELECT_NONE = "__none__";
const SELECT_UNASSIGNED = "__unassigned__";
const VENDOR_PAGE_SIZE = 25;

export default function ClientVendorsPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [promoterFilter, setPromoterFilter] = useState(SELECT_NONE);
  const vendorFilterKey = `${search}|${promoterFilter}`;
  const [paging, setPaging] = useState({ page: 1, filterKey: vendorFilterKey });
  if (paging.filterKey !== vendorFilterKey) {
    setPaging({ page: 1, filterKey: vendorFilterKey });
  }
  const page = paging.page;
  const setPage = (nextPage: number): void => {
    setPaging((current) => ({ ...current, page: nextPage }));
  };
  const skip = (page - 1) * VENDOR_PAGE_SIZE;
  const filtersActive = search.trim().length > 0 || promoterFilter !== SELECT_NONE;

  const outletsQuery = useQuery({
    queryKey: ["client", "outlets", { search, promoterFilter, page }],
    queryFn: async () =>
      listOutlets(accessToken ?? "", {
        limit: VENDOR_PAGE_SIZE,
        skip,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(promoterFilter === SELECT_UNASSIGNED ? { unassigned: true } : {}),
        ...(promoterFilter !== SELECT_NONE && promoterFilter !== SELECT_UNASSIGNED
          ? { createdByUserId: promoterFilter }
          : {})
      }),
    enabled: accessToken !== null,
    placeholderData: keepPreviousData
  });
  const outlets = outletsQuery.data?.items ?? [];
  const outletTotal = outletsQuery.data?.total ?? 0;
  const vendorPageCount = Math.max(1, Math.ceil(outletTotal / VENDOR_PAGE_SIZE));

  const promotersQuery = useQuery({
    queryKey: ["client", "promoters"],
    queryFn: async () => listPromoters(accessToken ?? ""),
    enabled: accessToken !== null
  });

  const promoterOptions = useMemo(() => {
    const merged = new Map((promotersQuery.data ?? []).map((user) => [user.id, user] as const));
    for (const outlet of outlets) {
      if (outlet.createdBy != null && !merged.has(outlet.createdBy.id)) {
        merged.set(outlet.createdBy.id, {
          id: outlet.createdBy.id,
          fullName: outlet.createdBy.fullName,
          isActive: true
        });
      }
    }
    return [...merged.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [outlets, promotersQuery.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Vendors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only directory of onboarded koko vendors.
        </p>
        <p className="mt-1 text-sm">
          <Link href="/dashboard/visits" className={calmMutedLinkClass}>
            Open visit reports
          </Link>
        </p>
      </div>

      <section className={cardClass}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-muted-foreground">
            Search
            <input
              className={inputClass}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Name, vendor ID, district…"
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Promoter
            <SearchableSelect
              value={promoterFilter}
              onValueChange={setPromoterFilter}
              placeholder="All promoters"
              searchPlaceholder="Search promoters…"
              options={[
                { value: SELECT_NONE, label: "All promoters" },
                { value: SELECT_UNASSIGNED, label: "Not recorded" },
                ...promoterOptions.map((user) => ({
                  value: user.id,
                  label: promoterOptionLabel(user, { includePhone: false })
                }))
              ]}
            />
          </label>
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">
          Vendor directory
          {outletsQuery.data !== undefined ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({formatPageRangeLabel(skip, outlets.length, outletTotal, "vendors")})
            </span>
          ) : null}
        </h2>
        {outletsQuery.isLoading ? (
          <BoneyardInlineFallback name="client-outlets-list" className="mt-3 min-h-48" />
        ) : null}
        {outletsQuery.isError ? (
          <p className="mt-3 text-sm text-destructive">Could not load vendors.</p>
        ) : null}
        {outletsQuery.data !== undefined && outletTotal === 0 && !filtersActive ? (
          <p className="mt-3 text-sm text-muted-foreground">No vendors yet.</p>
        ) : null}
        {outletsQuery.data !== undefined && outletTotal === 0 && filtersActive ? (
          <p className="mt-3 text-sm text-muted-foreground">No vendors match those filters.</p>
        ) : null}
        {outlets.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {outlets.map((outlet) => (
              <li
                key={outlet.id}
                className="rounded-lg border border-border bg-muted/20 p-4 dark:bg-muted/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <VendorAvatar outlet={outlet} size="md" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{outlet.name}</p>
                      {outlet.vendorCode ? (
                        <p className="font-mono text-xs text-foreground">{outlet.vendorCode}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">{outlet.category}</p>
                      {outlet.createdBy != null ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Onboarded by {outlet.createdBy.fullName}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[
                          outlet.district,
                          outlet.locationArea,
                          outlet.landmark,
                          outlet.region?.name,
                          outlet.yearsInBusiness != null
                            ? `${String(outlet.yearsInBusiness)} yrs`
                            : null
                        ]
                          .filter((part) => part != null && String(part).trim().length > 0)
                          .join(" · ") || "No location details"}
                      </p>
                      {outlet.latitude !== null && outlet.longitude !== null ? (
                        <p className="mt-1 text-xs">
                          <a
                            href={outletMapsUrl(outlet.latitude, outlet.longitude)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {outlet.latitude.toFixed(5)}, {outlet.longitude.toFixed(5)} — Maps
                          </a>
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">No map pin</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={
                        outlet.isActive
                          ? "rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"
                          : "rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      }
                    >
                      {outlet.isActive ? "Active" : "Inactive"}
                    </span>
                    <Link
                      href={`/dashboard/visits?outletId=${encodeURIComponent(outlet.id)}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Visits
                    </Link>
                  </div>
                </div>
                <VendorPhotoGallery outlet={outlet} className="mt-3" />
              </li>
            ))}
          </ul>
        ) : null}
        <ListPagination
          page={page}
          pageCount={vendorPageCount}
          onPageChange={setPage}
          label={formatPageRangeLabel(skip, outlets.length, outletTotal, "vendors")}
        />
      </section>
    </div>
  );
}
