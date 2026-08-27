"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmMutedLinkClass } from "@/lib/calm-ui";
import { formatFieldCheckInDateTime } from "@/lib/format-field-check-in-datetime";
import { listMyOutletVisits } from "@/lib/outlet/outlet-api";

export default function OutletVisitHistoryPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const visitsQuery = useQuery({
    queryKey: ["field", "outlet-visits", "history"],
    queryFn: async () => listMyOutletVisits(accessToken ?? "", 100),
    enabled: accessToken !== null,
    refetchInterval: 60_000
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm">
          <Link href="/dashboard/outlet-visits" className={calmMutedLinkClass}>
            Back to vendors
          </Link>
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
          Today&apos;s visits
          {visitsQuery.data !== undefined ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({visitsQuery.data.length} {visitsQuery.data.length === 1 ? "visit" : "visits"})
            </span>
          ) : null}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vendor visits you recorded today, including onboarding and items given. This list clears at
          midnight.{" "}
          <Link href="/dashboard/outlet-visits/visit" className={calmMutedLinkClass}>
            Record items given
          </Link>
        </p>
      </div>

      {visitsQuery.isLoading ? (
        <BoneyardInlineFallback
          name="field-outlet-visit-history"
          variant="lines4"
          className="min-h-40"
        />
      ) : null}
      {visitsQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load today's visits.
        </p>
      ) : null}
      {visitsQuery.data?.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
          No vendor visits recorded today.
        </p>
      ) : null}
      {visitsQuery.data !== undefined && visitsQuery.data.length > 0 ? (
        <ul className="space-y-2">
          {visitsQuery.data.map((visit) => (
            <li
              key={visit.id}
              className="rounded-xl border border-border bg-card/80 px-4 py-3 text-sm shadow-sm dark:bg-card/50"
            >
              <p className="font-medium text-foreground">
                {visit.outlet?.name ?? visit.outletId} ·{" "}
                {visit.kind === "items" ? "Items given" : "Onboarding"} ·{" "}
                {formatFieldCheckInDateTime(visit.checkedInAt)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {[visit.outlet?.district, visit.outlet?.locationArea]
                  .filter((p) => p != null && p.trim().length > 0)
                  .join(" · ") || "Community not available"}
                {" · "}
                {(visit.photos?.length ?? 0) > 0 || visit.hasOutletPhoto
                  ? `${String(visit.photos?.length ?? 1)} photo(s)`
                  : "No photo"}
                {visit.isComplete === false ? " · Incomplete" : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Checked in at {visit.latitude.toFixed(5)}, {visit.longitude.toFixed(5)}
              </p>
              {visit.visibilityScore != null ? (
                <p className="mt-2 text-xs text-foreground/90">
                  <span className="font-medium">Visibility:</span>{" "}
                  {Math.round(visit.visibilityScore)}%
                </p>
              ) : null}
              {visit.consumerEngagementNotes ? (
                <p className="mt-1 text-xs text-foreground/90">
                  <span className="font-medium">Notes:</span> {visit.consumerEngagementNotes}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
