"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactElement } from "react";

import { useAuthStore } from "@/lib/auth/auth-store";
import { calmPrimaryButtonInlineClass, calmToolbarOutlineButtonInlineClass } from "@/lib/calm-ui";
import { listOpsAlerts, markAllOpsAlertsRead, markOpsAlertRead } from "@/lib/outlet/outlet-api";
import { toast } from "@/lib/toast";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm";

type AlertMeta = {
  outletId?: string;
  visitId?: string;
  userId?: string;
  vendorId?: string;
};

const parseMeta = (metaJson: string | null): AlertMeta => {
  if (!metaJson) return {};
  try {
    const parsed = JSON.parse(metaJson) as unknown;
    if (parsed === null || typeof parsed !== "object") return {};
    const record = parsed as Record<string, unknown>;
    return {
      ...(typeof record.outletId === "string" ? { outletId: record.outletId } : {}),
      ...(typeof record.visitId === "string" ? { visitId: record.visitId } : {}),
      ...(typeof record.userId === "string" ? { userId: record.userId } : {}),
      ...(typeof record.vendorId === "string" ? { vendorId: record.vendorId } : {})
    };
  } catch {
    return {};
  }
};

const alertLinks = (kind: string, meta: AlertMeta): { href: string; label: string }[] => {
  const links: { href: string; label: string }[] = [];
  const outletId = meta.outletId ?? meta.vendorId;
  if (kind === "new_vendor" && outletId) {
    links.push({ href: "/ops/outlets", label: "Open vendors" });
  }
  if (kind === "incomplete_visit") {
    const params = new URLSearchParams();
    if (outletId) params.set("outletId", outletId);
    if (meta.userId) params.set("userId", meta.userId);
    const qs = params.toString();
    links.push({
      href: qs.length > 0 ? `/ops/outlets/visits?${qs}` : "/ops/outlets/visits",
      label: "Open visit reports"
    });
    if (meta.visitId) {
      links.push({
        href: `/ops/outlets/visits#visit-${meta.visitId}`,
        label: "Jump to visit"
      });
    }
  }
  if (kind === "missed_check_in") {
    links.push({ href: "/ops/attendance", label: "Open attendance" });
  }
  if (kind === "sync_failure") {
    links.push({ href: "/ops/outlets/visits", label: "Review visits" });
  }
  return links;
};

export default function OpsAlertsPage(): ReactElement {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ["ops", "alerts"],
    queryFn: async () => listOpsAlerts(accessToken ?? ""),
    enabled: accessToken !== null,
    refetchInterval: 30_000
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => markOpsAlertRead(accessToken ?? "", id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["ops", "alerts"] })
  });

  const markAllMutation = useMutation({
    mutationFn: async () => markAllOpsAlertsRead(accessToken ?? ""),
    onSuccess: () => {
      toast.success("All alerts marked read");
      void queryClient.invalidateQueries({ queryKey: ["ops", "alerts"] });
    }
  });

  const alerts = alertsQuery.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Missed check-ins, incomplete visits, sync failures, and new vendor registrations.
          </p>
        </div>
        <button
          type="button"
          className={calmToolbarOutlineButtonInlineClass}
          disabled={markAllMutation.isPending || alerts.every((a) => a.isRead)}
          onClick={() => markAllMutation.mutate()}
        >
          Mark all read
        </button>
      </div>

      <section className={cardClass}>
        {alertsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alerts yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {alerts.map((alert) => {
              const meta = parseMeta(alert.metaJson);
              const links = alertLinks(alert.kind, meta);
              return (
                <li
                  key={alert.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{alert.title}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {alert.kind.replaceAll("_", " ")}
                      </span>
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {alert.severity}
                      </span>
                      {!alert.isRead ? (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                          New
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                    {links.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-3">
                        {links.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {!alert.isRead ? (
                    <button
                      type="button"
                      className={calmPrimaryButtonInlineClass}
                      disabled={markReadMutation.isPending}
                      onClick={() => markReadMutation.mutate(alert.id)}
                    >
                      Mark read
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
