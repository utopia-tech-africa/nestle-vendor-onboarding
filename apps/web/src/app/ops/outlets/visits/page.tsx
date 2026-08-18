"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseJsonStringArray } from "@/lib/outlet/field-catalogs";
import {
  formatVisitCountLabel,
  listOutletVisitReports,
  listOutlets,
  vendorLabel,
  type OutletVisitRecord
} from "@/lib/outlet/outlet-api";
import { toast } from "@/lib/toast";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";

const boolLabel = (value: boolean | null | undefined): string => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
};

const questionnaireSummary = (visit: OutletVisitRecord): string => {
  const answers = visit.questionnaireResponses?.flatMap((r) => r.answers) ?? [];
  if (answers.length === 0) return "";
  return answers
    .map((a) => `${a.question?.prompt ?? a.questionId}: ${a.valueText ?? ""}`)
    .join(" | ");
};

const competitorSummary = (visit: OutletVisitRecord): string => {
  if (!visit.competitorObservations || visit.competitorObservations.length === 0) return "";
  return visit.competitorObservations
    .map((c) => {
      const brand =
        c.brandName === "Other" && c.brandNameOther?.trim()
          ? c.brandNameOther.trim()
          : c.brandName;
      const products = parseJsonStringArray(c.productsJson).join(", ");
      const notes = [
        products ? `Products: ${products}` : null,
        c.pricingNotes,
        c.promotionsNotes,
        c.discountsNotes,
        c.newLaunchesNotes,
        c.displayQualityNotes,
        c.marketObservations
      ]
        .filter((n) => n != null && n.trim().length > 0)
        .join("; ");
      return notes.length > 0 ? `${brand} (${notes})` : brand;
    })
    .join(" | ");
};

const visitToExcelRow = (visit: OutletVisitRecord) => ({
  checkedInAt: visit.checkedInAt,
  vendorId: visit.outlet?.vendorCode ?? "",
  vendorName: visit.outlet?.name ?? visit.outletId,
  vendorType: visit.outlet?.category ?? "",
  district: visit.outlet?.district ?? "",
  community: visit.outlet?.locationArea ?? "",
  promoterName: visit.user?.fullName ?? visit.userId,
  promoterPhone: visit.user?.phone ?? "",
  latitude: visit.latitude,
  longitude: visit.longitude,
  isComplete: visit.isComplete === false ? "No" : "Yes",
  incompleteReasons: visit.incompleteReasons ?? "",
  photoCount: visit.photos?.length ?? (visit.hasOutletPhoto ? 1 : 0),
  trafficCategory: visit.trafficCategory ?? "",
  footfallEstimated: visit.footfallEstimated ?? "",
  footfallManualCount: visit.footfallManualCount ?? "",
  footfallPeakPeriods: visit.footfallPeakPeriods ?? "",
  nestleProductAvailable: boolLabel(visit.nestleProductAvailable),
  nestleProducts: parseJsonStringArray(visit.nestleProductsJson).join(", "),
  visibilityScore: visit.visibilityScore ?? "",
  productPlacementNotes: visit.productPlacementNotes ?? "",
  shelfVisibilityNotes: visit.shelfVisibilityNotes ?? "",
  posMaterialsPresent: boolLabel(visit.posMaterialsPresent),
  promotionalMaterialsPresent: boolLabel(visit.promotionalMaterialsPresent),
  stockLevelNotes: visit.stockLevelNotes ?? "",
  outOfStock: boolLabel(visit.outOfStock),
  competitors: competitorSummary(visit),
  questionnaire: questionnaireSummary(visit),
  notes: visit.consumerEngagementNotes ?? ""
});

export default function OpsOutletVisitsReportPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const searchParams = useSearchParams();
  const [outletId, setOutletId] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isExportingAll, setIsExportingAll] = useState(false);

  useEffect(() => {
    const outletFromUrl = searchParams.get("outletId");
    const userFromUrl = searchParams.get("userId");
    if (outletFromUrl) setOutletId(outletFromUrl);
    if (userFromUrl) setUserId(userFromUrl);
    if (typeof window !== "undefined" && window.location.hash.startsWith("#visit-")) {
      setExpandedId(window.location.hash.slice("#visit-".length));
    }
  }, [searchParams]);

  const outletsQuery = useQuery({
    queryKey: ["ops", "outlets"],
    queryFn: async () => listOutlets(accessToken ?? ""),
    enabled: accessToken !== null
  });

  const visitsQuery = useQuery({
    queryKey: ["ops", "outlet-visits", { outletId, userId, from, to }],
    queryFn: async () =>
      listOutletVisitReports(accessToken ?? "", {
        limit: 200,
        ...(outletId ? { outletId } : {}),
        ...(userId.trim() ? { userId: userId.trim() } : {}),
        ...(from ? { from: new Date(`${from}T00:00:00.000Z`).toISOString() } : {}),
        ...(to ? { to: new Date(`${to}T23:59:59.999Z`).toISOString() } : {})
      }),
    enabled: accessToken !== null
  });

  const visits = visitsQuery.data?.items ?? [];
  const visitTotal = visitsQuery.data?.total ?? 0;

  const uniqueUsers = useMemo(() => {
    const users = new Map<string, { id: string; fullName: string; phone: string }>();
    for (const row of visits) {
      if (row.user !== undefined) {
        users.set(row.user.id, {
          id: row.user.id,
          fullName: row.user.fullName,
          phone: row.user.phone
        });
      }
    }
    return [...users.values()];
  }, [visits]);

  const exportExcel = (): void => {
    if (visits.length === 0) {
      return;
    }
    const rows = visits.map(visitToExcelRow);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendor Visits");
    const now = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `vendor-visit-reports-${now}.xlsx`);
    toast.success(`Exported ${String(rows.length)} rows to Excel.`);
  };

  const exportAllPagesExcel = async (): Promise<void> => {
    if (accessToken === null) {
      return;
    }
    setIsExportingAll(true);
    try {
      const pageSize = 200;
      let skip = 0;
      const allRows: OutletVisitRecord[] = [];
      for (;;) {
        const page = await listOutletVisitReports(accessToken, {
          limit: pageSize,
          skip,
          ...(outletId ? { outletId } : {}),
          ...(userId.trim() ? { userId: userId.trim() } : {}),
          ...(from ? { from: new Date(`${from}T00:00:00.000Z`).toISOString() } : {}),
          ...(to ? { to: new Date(`${to}T23:59:59.999Z`).toISOString() } : {})
        });
        allRows.push(...page.items);
        if (page.items.length < pageSize) {
          break;
        }
        skip += pageSize;
      }

      if (allRows.length === 0) {
        toast.info("No rows matched the selected filters.");
        return;
      }

      const rows = allRows.map(visitToExcelRow);
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Vendor Visits");
      const now = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `vendor-visit-reports-all-pages-${now}.xlsx`);
      toast.success(`Exported ${String(rows.length)} rows from all pages.`);
    } catch {
      toast.error("Failed to export all pages. Please try again.");
    } finally {
      setIsExportingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Vendor visit reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter visits by vendor, promoter, and date. Review photos, questionnaire, footfall,
          visibility, and competitor intel.
        </p>
      </div>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Filters</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-muted-foreground">
            Vendor
            <Select
              value={outletId.length > 0 ? outletId : "all"}
              onValueChange={(value) => {
                setOutletId(value === "all" ? "" : value);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vendors</SelectItem>
                {outletsQuery.data?.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {vendorLabel(outlet)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Promoter
            <Select
              value={userId.length > 0 ? userId : "all"}
              onValueChange={(value) => {
                setUserId(value === "all" ? "" : value);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All promoters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All promoters</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName} ({user.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            From
            <DatePicker value={from} onChange={setFrom} placeholder="From date" />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            To
            <DatePicker value={to} onChange={setTo} placeholder="To date" />
          </label>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">
            Results
            {visitsQuery.data !== undefined ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({formatVisitCountLabel(visits.length, visitTotal)})
              </span>
            ) : null}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={visits.length === 0}
              onClick={exportExcel}
            >
              Export current page
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isExportingAll || accessToken === null}
              onClick={() => {
                void exportAllPagesExcel();
              }}
            >
              {isExportingAll ? "Exporting all..." : "Export all pages"}
            </button>
          </div>
        </div>
        {visitsQuery.isLoading ? (
          <BoneyardInlineFallback name="ops-outlet-visits-report" className="mt-3 min-h-[12rem]" />
        ) : null}
        {visitsQuery.isError ? (
          <p className="mt-3 text-sm text-destructive">Could not load vendor visit reports.</p>
        ) : null}
        {visitsQuery.data !== undefined && visits.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No vendor visits match the selected filters.
          </p>
        ) : null}
        {visits.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {visits.map((visit) => {
              const isExpanded = expandedId === visit.id;
              const answers = visit.questionnaireResponses?.flatMap((r) => r.answers) ?? [];
              return (
                <li
                  key={visit.id}
                  id={`visit-${visit.id}`}
                  className="rounded-lg border border-border bg-muted/20 p-4 dark:bg-muted/10"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {visit.outlet?.name ?? visit.outletId} ·{" "}
                        {new Date(visit.checkedInAt).toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {visit.user?.fullName ?? visit.userId} · {visit.user?.phone ?? "No phone"} ·{" "}
                        {[visit.outlet?.district, visit.outlet?.locationArea]
                          .filter((p) => p != null && p.trim().length > 0)
                          .join(" · ") || "No community"}
                        {" · "}
                        {visit.hasOutletPhoto || (visit.photos?.length ?? 0) > 0
                          ? `${String(visit.photos?.length ?? (visit.hasOutletPhoto ? 1 : 0))} photo(s)`
                          : "No photo"}
                        {visit.isComplete === false ? " · Incomplete" : ""}
                        {visit.visibilityScore != null
                          ? ` · Visibility ${Math.round(visit.visibilityScore)}%`
                          : ""}
                        {visit.trafficCategory ? ` · Traffic ${visit.trafficCategory}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {visit.latitude.toFixed(5)}, {visit.longitude.toFixed(5)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => setExpandedId(isExpanded ? null : visit.id)}
                    >
                      {isExpanded ? "Hide details" : "Show details"}
                    </button>
                  </div>

                  {(visit.photos?.length ?? 0) > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {visit.photos?.map((photo) =>
                        photo.cloudinaryUrl ? (
                          <a
                            key={photo.id}
                            href={photo.cloudinaryUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block overflow-hidden rounded-md border border-border"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.cloudinaryUrl}
                              alt={photo.category}
                              className="h-20 w-20 object-cover"
                            />
                          </a>
                        ) : (
                          <span
                            key={photo.id}
                            className="rounded-md border border-border px-2 py-1 text-[10px] uppercase text-muted-foreground"
                          >
                            {photo.category}
                          </span>
                        )
                      )}
                    </div>
                  ) : null}

                  {isExpanded ? (
                    <div className="mt-3 space-y-3 border-t border-border pt-3 text-xs">
                      {visit.isComplete === false && visit.incompleteReasons ? (
                        <p>
                          <span className="font-medium text-amber-700 dark:text-amber-400">
                            Incomplete:
                          </span>{" "}
                          {visit.incompleteReasons}
                        </p>
                      ) : null}

                      <div>
                        <p className="font-medium text-foreground">Footfall</p>
                        <p className="mt-0.5 text-muted-foreground">
                          {[
                            visit.trafficCategory ? `Traffic ${visit.trafficCategory}` : null,
                            visit.footfallEstimated != null
                              ? `Est. ${String(visit.footfallEstimated)}`
                              : null,
                            visit.footfallManualCount != null
                              ? `Manual ${String(visit.footfallManualCount)}`
                              : null,
                            visit.footfallPeakPeriods
                              ? `Peaks: ${visit.footfallPeakPeriods}`
                              : null
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Not captured"}
                        </p>
                      </div>

                      <div>
                        <p className="font-medium text-foreground">Visibility</p>
                        <ul className="mt-1 space-y-0.5 text-muted-foreground">
                          <li>
                            Nestlé product available:{" "}
                            {boolLabel(visit.nestleProductAvailable) || "—"}
                            {parseJsonStringArray(visit.nestleProductsJson).length > 0
                              ? ` (${parseJsonStringArray(visit.nestleProductsJson).join(", ")})`
                              : ""}
                          </li>
                          <li>
                            Visibility score:{" "}
                            {visit.visibilityScore != null
                              ? `${Math.round(visit.visibilityScore)}%`
                              : "—"}
                          </li>
                          <li>POS materials: {boolLabel(visit.posMaterialsPresent) || "—"}</li>
                          <li>
                            Promotional materials:{" "}
                            {boolLabel(visit.promotionalMaterialsPresent) || "—"}
                          </li>
                          <li>Out of stock: {boolLabel(visit.outOfStock) || "—"}</li>
                          {visit.productPlacementNotes ? (
                            <li>Placement: {visit.productPlacementNotes}</li>
                          ) : null}
                          {visit.shelfVisibilityNotes ? (
                            <li>Shelf: {visit.shelfVisibilityNotes}</li>
                          ) : null}
                          {visit.stockLevelNotes ? <li>Stock: {visit.stockLevelNotes}</li> : null}
                        </ul>
                      </div>

                      {visit.competitorObservations && visit.competitorObservations.length > 0 ? (
                        <div>
                          <p className="font-medium text-foreground">Competitors</p>
                          <ul className="mt-1 space-y-2">
                            {visit.competitorObservations.map((c) => (
                              <li key={c.id} className="rounded-md bg-background/60 p-2">
                                <p className="font-medium">
                                  {c.brandName === "Other" && c.brandNameOther?.trim()
                                    ? c.brandNameOther
                                    : c.brandName}
                                </p>
                                {parseJsonStringArray(c.productsJson).length > 0 ? (
                                  <p className="mt-0.5 text-muted-foreground">
                                    Products: {parseJsonStringArray(c.productsJson).join(", ")}
                                  </p>
                                ) : null}
                                <p className="mt-0.5 text-muted-foreground">
                                  {[
                                    c.pricingNotes && `Pricing: ${c.pricingNotes}`,
                                    c.promotionsNotes && `Promos: ${c.promotionsNotes}`,
                                    c.discountsNotes && `Discounts: ${c.discountsNotes}`,
                                    c.newLaunchesNotes && `Launches: ${c.newLaunchesNotes}`,
                                    c.displayQualityNotes && `Display: ${c.displayQualityNotes}`,
                                    c.marketObservations && `Market: ${c.marketObservations}`
                                  ]
                                    .filter(Boolean)
                                    .join(" · ") || "No notes"}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {answers.length > 0 ? (
                        <div>
                          <p className="font-medium text-foreground">Questionnaire</p>
                          <ul className="mt-1 space-y-1">
                            {answers.map((a) => (
                              <li key={`${a.questionId}-${a.valueText ?? ""}`}>
                                <span className="text-muted-foreground">
                                  {a.question?.prompt ?? a.questionId}:
                                </span>{" "}
                                {a.valueText ?? "—"}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No questionnaire answers.</p>
                      )}

                      {visit.consumerEngagementNotes ? (
                        <p>
                          <span className="font-medium">Notes:</span> {visit.consumerEngagementNotes}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
