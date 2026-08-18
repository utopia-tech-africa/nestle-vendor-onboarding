"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactElement, useMemo, useState } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { outletMapsUrl } from "@/components/outlet-map-preview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { VendorAvatar, VendorPhotoGallery } from "@/components/vendor-photos";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmMutedLinkClass } from "@/lib/calm-ui";
import { listOutlets, uniqueOutletPromoters, type OutletRecord } from "@/lib/outlet/outlet-api";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";
const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const SELECT_NONE = "__none__";
const SELECT_UNASSIGNED = "__unassigned__";
const EMPTY_OUTLETS: OutletRecord[] = [];

export default function ClientVendorsPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [search, setSearch] = useState("");
  const [promoterFilter, setPromoterFilter] = useState(SELECT_NONE);

  const outletsQuery = useQuery({
    queryKey: ["client", "outlets"],
    queryFn: async () => listOutlets(accessToken ?? ""),
    enabled: accessToken !== null
  });
  const outlets = outletsQuery.data ?? EMPTY_OUTLETS;

  const promoterOptions = useMemo(() => uniqueOutletPromoters(outlets), [outlets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return outlets.filter((outlet: OutletRecord) => {
      if (promoterFilter === SELECT_UNASSIGNED && outlet.createdBy != null) return false;
      if (
        promoterFilter !== SELECT_NONE &&
        promoterFilter !== SELECT_UNASSIGNED &&
        outlet.createdBy?.id !== promoterFilter
      ) {
        return false;
      }
      if (q.length === 0) return true;
      const hay = [
        outlet.name,
        outlet.vendorCode,
        outlet.category,
        outlet.contactName,
        outlet.contactPhone,
        outlet.contactPhoneSecondary,
        outlet.landmark,
        outlet.district,
        outlet.locationArea,
        outlet.region?.name,
        outlet.createdBy?.fullName,
        outlet.createdBy?.phone
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [outlets, promoterFilter, search]);

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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, vendor ID, phone, district…"
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Promoter
            <Select value={promoterFilter} onValueChange={setPromoterFilter}>
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue placeholder="All promoters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>All promoters</SelectItem>
                <SelectItem value={SELECT_UNASSIGNED}>Not recorded</SelectItem>
                {promoterOptions.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName} ({user.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">
          Vendor directory
          {outletsQuery.data !== undefined ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filtered.length}
              {search.trim() || promoterFilter !== SELECT_NONE
                ? ` of ${outlets.length}`
                : ""}
              )
            </span>
          ) : null}
        </h2>
        {outletsQuery.isLoading ? (
          <BoneyardInlineFallback name="client-outlets-list" className="mt-3 min-h-[12rem]" />
        ) : null}
        {outletsQuery.isError ? (
          <p className="mt-3 text-sm text-destructive">Could not load vendors.</p>
        ) : null}
        {outletsQuery.data?.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No vendors yet.</p>
        ) : null}
        {filtered.length === 0 && (outletsQuery.data?.length ?? 0) > 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No vendors match those filters.</p>
        ) : null}
        {filtered.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {filtered.map((outlet) => (
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
                      <p className="text-xs text-muted-foreground">
                        {outlet.category}
                        {outlet.contactName ? ` · ${outlet.contactName}` : ""}
                        {outlet.contactPhone ? ` · ${outlet.contactPhone}` : ""}
                        {outlet.contactPhoneSecondary ? ` · ${outlet.contactPhoneSecondary}` : ""}
                      </p>
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
      </section>
    </div>
  );
}
