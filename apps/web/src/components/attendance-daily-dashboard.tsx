"use client";

import { type ReactElement, type ReactNode } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { DatePicker } from "@/components/ui/date-picker";
import { calmPrimaryButtonInlineClass, calmToolbarOutlineButtonInlineClass } from "@/lib/calm-ui";
import type { AdminAttendanceDailySummary } from "@/lib/ops/ops-attendance-adapters";
import { cn } from "@/lib/utils";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";

const statusPill = (label: string, tone: "ok" | "warn" | "bad"): string =>
  cn(
    "inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
    tone === "ok" && "bg-secondary/15 text-secondary",
    tone === "warn" && "bg-amber-500/15 text-amber-800 dark:text-amber-200",
    tone === "bad" && "bg-destructive/15 text-destructive"
  );

const formatTimeInZone = (iso: string, timeZone: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(iso));

const SummaryTiles = ({
  summary
}: {
  summary: AdminAttendanceDailySummary["summary"];
}): ReactElement => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
    <div className={cardClass}>
      <p className="text-xs font-medium text-muted-foreground">Team size</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{summary.total}</p>
    </div>
    <div className={cardClass}>
      <p className="text-xs font-medium text-muted-foreground">Present</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
        {summary.present}
      </p>
    </div>
    <div className={cardClass}>
      <p className="text-xs font-medium text-muted-foreground">Missed</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-destructive">{summary.missed}</p>
    </div>
    <div className={cardClass}>
      <p className="text-xs font-medium text-muted-foreground">Late clock-in</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">
        {summary.late}
      </p>
    </div>
    <div className={cardClass}>
      <p className="text-xs font-medium text-muted-foreground">No clock-out</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {summary.missingClockOut}
      </p>
    </div>
  </div>
);

export type AttendanceDailyDashboardProps = {
  title: string;
  description: string;
  date: string;
  onDateChange: (value: string) => void;
  filterSlot?: ReactNode;
  emptyRowsHint?: string;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  onToday: () => void;
  data: AdminAttendanceDailySummary | undefined;
};

export const AttendanceDailyDashboard = ({
  title,
  description,
  date,
  onDateChange,
  filterSlot,
  emptyRowsHint = "No active field staff match this filter.",
  isLoading,
  isError,
  isFetching,
  onRefresh,
  onToday,
  data
}: AttendanceDailyDashboardProps): ReactElement => {
  const formatDayTime = (iso: string | null, tz: string): string =>
    iso === null ? "—" : formatTimeInZone(iso, tz);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>

      <section className={cardClass}>
        <h2 className="text-sm font-semibold text-foreground">Filters</h2>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground sm:min-w-40">
            Date
            <DatePicker
              value={date}
              onChange={onDateChange}
              placeholder="Select date"
              className="mt-0"
            />
          </label>
          {filterSlot}
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:ml-auto">
            <button type="button" className={calmToolbarOutlineButtonInlineClass} onClick={onToday}>
              Today
            </button>
            <button
              type="button"
              className={calmPrimaryButtonInlineClass}
              onClick={onRefresh}
              disabled={isFetching || date.length !== 10}
            >
              {isFetching ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <BoneyardInlineFallback
          name="attendance-daily-summary"
          variant="lines4"
          className="min-h-[14rem] w-full max-w-4xl"
        />
      ) : null}
      {isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load attendance. Check your connection and try again.
        </p>
      ) : null}

      {data !== undefined ? (
        <div className="space-y-6">
          <p className="text-xs text-muted-foreground">
            Day <span className="font-mono text-foreground">{data.date}</span> · IANA{" "}
            <span className="font-mono text-foreground">{data.timezone}</span> · Expected clock-in{" "}
            <span className="font-mono text-foreground">{data.expectedCheckInLocal}</span> local
          </p>
          <SummaryTiles summary={data.summary} />

          {data.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyRowsHint}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 dark:bg-muted/15">
                    <th className="px-3 py-2 font-medium text-muted-foreground">Name</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Region</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Clock in</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Clock out</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Hours</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.userId} className="border-b border-border/80 last:border-0">
                      <td className="px-3 py-2">
                        <span className="font-medium text-foreground">{row.fullName}</span>
                        <span className="mt-0.5 block text-xs capitalize text-muted-foreground">
                          {row.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {row.regionName ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs tabular-nums text-foreground">
                        {formatDayTime(row.firstClockInAt, data.timezone)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs tabular-nums text-foreground">
                        {formatDayTime(row.lastClockOutAt, data.timezone)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs tabular-nums text-foreground">
                        {row.totalWorkingHours != null ? `${row.totalWorkingHours}h` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {row.missed ? (
                            <span className={statusPill("Missed", "bad")}>Missed</span>
                          ) : null}
                          {row.late ? (
                            <span className={statusPill("Late", "warn")}>Late</span>
                          ) : null}
                          {!row.missed && !row.late ? (
                            <span className={statusPill("On time", "ok")}>On time</span>
                          ) : null}
                          {row.missingClockOut ? (
                            <span className={statusPill("No out", "warn")}>No clock-out</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
