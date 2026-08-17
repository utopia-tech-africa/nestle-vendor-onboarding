"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactElement, useState } from "react";
import * as XLSX from "xlsx";

import { BoneyardBlock } from "@/components/boneyard/boneyard-block";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { apiRequestBlob } from "@/lib/api/http-client";
import {
  useAdminRegionListRegions,
  useAdminUserListUsers
} from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  calmMutedLinkClass,
  calmPrimaryButtonInlineClass,
  calmToolbarOutlineButtonInlineClass
} from "@/lib/calm-ui";
import { parseAdminUsersFromOrval, parseRegionsFromOrval } from "@/lib/ops/ops-adapters";
import { downloadNestleCsvUrl, downloadNestlePdfUrl, getNestleOverview } from "@/lib/outlet/outlet-api";
import { toast } from "@/lib/toast";

const shellCard = "rounded-xl border border-border bg-card/80 shadow-sm dark:bg-card/50";
const SELECT_ALL = "__all__";

type StatCellProps = {
  label: string;
  value: string | number;
  detail?: string;
  loading?: boolean;
};

const StatCell = ({ label, value, detail, loading }: StatCellProps): ReactElement => (
  <div className="min-w-0 px-1 py-2 sm:px-2">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </p>
    {loading ? (
      <BoneyardBlock
        name={`nestle-${label}`}
        loading
        variant="statValue"
        className="mt-1.5 block h-9 w-28 max-w-full"
      >
        <span className="sr-only">Loading {label}</span>
      </BoneyardBlock>
    ) : (
      <p className="mt-1.5 truncate text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
    )}
    {detail ? <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p> : null}
  </div>
);

export default function OpsOverviewPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [regionId, setRegionId] = useState("");
  const [userId, setUserId] = useState("");

  const regionsQuery = useAdminRegionListRegions({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseRegionsFromOrval(r).filter((row) => row.isActive)
    }
  });

  const usersQuery = useAdminUserListUsers({
    query: {
      enabled: accessToken !== null,
      select: (r) =>
        parseAdminUsersFromOrval(r).filter((u) => u.role === "promoter" && u.isActive)
    }
  });

  const filterParams = {
    ...(from ? { from: new Date(`${from}T00:00:00.000Z`).toISOString() } : {}),
    ...(to ? { to: new Date(`${to}T23:59:59.999Z`).toISOString() } : {}),
    ...(regionId ? { regionId } : {}),
    ...(userId ? { userId } : {})
  };

  const overviewQuery = useQuery({
    queryKey: ["ops", "nestle", "overview", filterParams],
    queryFn: async () => getNestleOverview(accessToken ?? "", filterParams),
    enabled: accessToken !== null,
    refetchInterval: 60_000
  });

  const data = overviewQuery.data;
  const loading = overviewQuery.isLoading;

  const downloadCsv = async (kind: "visits" | "vendors" | "competitors"): Promise<void> => {
    if (!accessToken) return;
    try {
      const path = downloadNestleCsvUrl({
        kind,
        ...filterParams
      });
      const { blob } = await apiRequestBlob(path, { token: accessToken });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nestle-${kind}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download CSV");
    }
  };

  const downloadPdfPack = async (): Promise<void> => {
    if (!accessToken) return;
    try {
      const path = downloadNestlePdfUrl(filterParams);
      const { blob } = await apiRequestBlob(path, { token: accessToken });
      const headerBytes = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
      const header = String.fromCharCode(...headerBytes);
      if (!header.startsWith("%PDF-")) {
        throw new Error("invalid pdf");
      }
      const pdfBlob =
        blob.type === "application/pdf"
          ? blob
          : new Blob([await blob.arrayBuffer()], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nestle-programme-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF report downloaded.");
    } catch {
      toast.error("Could not download PDF");
    }
  };

  const exportExcelPack = (): void => {
    if (!data) {
      toast.error("Load overview data first.");
      return;
    }
    const workbook = XLSX.utils.book_new();
    const kpiRows = [
      { metric: "Vendors onboarded", value: data.vendorsOnboarded },
      { metric: "Active promoters", value: data.activePromoters },
      { metric: "Daily visits", value: data.dailyVisits },
      { metric: "Completed questionnaires", value: data.completedQuestionnaires },
      {
        metric: "Visibility score avg %",
        value: data.visibilityScoreAvg != null ? Math.round(data.visibilityScoreAvg) : ""
      },
      { metric: "Competitor reports", value: data.competitorReports },
      {
        metric: "Footfall estimated avg",
        value: data.footfall.estimatedAvg != null ? Math.round(data.footfall.estimatedAvg) : ""
      },
      {
        metric: "Footfall estimated sum",
        value: data.footfall.estimatedSum ?? ""
      },
      { metric: "Incomplete visits", value: data.incompleteVisits },
      { metric: "Unread alerts", value: data.unreadAlerts }
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(kpiRows), "KPIs");
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        data.regionalPerformance.map((r) => ({
          region: r.regionName,
          vendors: r.vendorCount
        }))
      ),
      "Vendor distribution"
    );
    const now = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `nestle-overview-pack-${now}.xlsx`);
    toast.success("Excel pack downloaded. Use CSV buttons for visit-level detail.");
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Nestlé overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time vendor onboarding and field monitoring.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className={calmToolbarOutlineButtonInlineClass}
            onClick={() => void downloadCsv("vendors")}
          >
            CSV vendors
          </button>
          <button
            type="button"
            className={calmToolbarOutlineButtonInlineClass}
            onClick={() => void downloadCsv("visits")}
          >
            CSV visits
          </button>
          <button
            type="button"
            className={calmToolbarOutlineButtonInlineClass}
            onClick={() => void downloadCsv("competitors")}
          >
            CSV competitors
          </button>
          <button
            type="button"
            className={calmToolbarOutlineButtonInlineClass}
            onClick={exportExcelPack}
            disabled={!data}
          >
            Excel pack
          </button>
          <button
            type="button"
            className={calmToolbarOutlineButtonInlineClass}
            onClick={() => void downloadPdfPack()}
          >
            PDF pack
          </button>
          <button
            type="button"
            className={calmPrimaryButtonInlineClass}
            onClick={() => void queryClient.invalidateQueries({ queryKey: ["ops", "nestle"] })}
          >
            Refresh
          </button>
        </div>
      </div>

      <section className={`${shellCard} p-4`}>
        <h2 className="text-sm font-semibold">Filters</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-muted-foreground">
            From
            <DatePicker value={from} onChange={setFrom} placeholder="From date" />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            To
            <DatePicker value={to} onChange={setTo} placeholder="To date" />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Region
            <Select
              value={regionId.length > 0 ? regionId : SELECT_ALL}
              onValueChange={(value) => setRegionId(value === SELECT_ALL ? "" : value)}
            >
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_ALL}>All regions</SelectItem>
                {(regionsQuery.data ?? []).map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Promoter
            <Select
              value={userId.length > 0 ? userId : SELECT_ALL}
              onValueChange={(value) => setUserId(value === SELECT_ALL ? "" : value)}
            >
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue placeholder="All promoters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_ALL}>All promoters</SelectItem>
                {(usersQuery.data ?? []).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </section>

      <section className={`${shellCard} grid grid-cols-2 gap-1 p-3 sm:grid-cols-3 lg:grid-cols-5`}>
        <StatCell label="Vendors onboarded" value={data?.vendorsOnboarded ?? "—"} loading={loading} />
        <StatCell label="Active promoters" value={data?.activePromoters ?? "—"} loading={loading} />
        <StatCell label="Daily visits" value={data?.dailyVisits ?? "—"} loading={loading} />
        <StatCell
          label="Questionnaires"
          value={data?.completedQuestionnaires ?? "—"}
          loading={loading}
        />
        <StatCell
          label="Visibility score"
          value={
            data?.visibilityScoreAvg != null ? `${Math.round(data.visibilityScoreAvg)}%` : "—"
          }
          loading={loading}
        />
        <StatCell label="Competitor reports" value={data?.competitorReports ?? "—"} loading={loading} />
        <StatCell
          label="Footfall (avg)"
          value={
            data?.footfall.estimatedAvg != null ? Math.round(data.footfall.estimatedAvg) : "—"
          }
          loading={loading}
        />
        <StatCell label="Incomplete visits" value={data?.incompleteVisits ?? "—"} loading={loading} />
        <StatCell label="Unread alerts" value={data?.unreadAlerts ?? "—"} loading={loading} />
      </section>

      <section className={`${shellCard} p-4`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Regional performance</h2>
          <Link href="/ops/visits-map" className={calmMutedLinkClass}>
            Visits map
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (data?.regionalPerformance.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No regional vendor data yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data?.regionalPerformance.map((row) => (
              <li key={row.regionId ?? "unassigned"} className="flex justify-between py-2 text-sm">
                <span>{row.regionName}</span>
                <span className="tabular-nums text-muted-foreground">{row.vendorCount} vendors</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${shellCard} p-4`}>
        <h2 className="text-sm font-semibold">Quick links</h2>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm">
          <li>
            <Link href="/ops/outlets" className={calmMutedLinkClass}>
              Vendors
            </Link>
          </li>
          <li>
            <Link href="/ops/outlets/visits" className={calmMutedLinkClass}>
              Vendor visits
            </Link>
          </li>
          <li>
            <Link href="/ops/questionnaires" className={calmMutedLinkClass}>
              Questionnaires
            </Link>
          </li>
          <li>
            <Link href="/ops/catalogs" className={calmMutedLinkClass}>
              Products & competitors
            </Link>
          </li>
          <li>
            <Link href="/ops/attendance" className={calmMutedLinkClass}>
              Attendance
            </Link>
          </li>
          <li>
            <Link href="/ops/visits-map" className={calmMutedLinkClass}>
              Visits map
            </Link>
          </li>
          <li>
            <Link href="/ops/alerts" className={calmMutedLinkClass}>
              Alerts
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
