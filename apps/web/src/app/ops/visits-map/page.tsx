"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, useMemo, useState } from "react";

import { BoneyardBlock } from "@/components/boneyard/boneyard-block";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAdminRegionListRegions } from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseRegionsFromOrval } from "@/lib/ops/ops-adapters";
import { getVisitsMap } from "@/lib/outlet/outlet-api";

const SELECT_ALL = "__all__";

const ActivationFieldActivityMap = dynamic(
  () =>
    import("@/components/activation-field-activity-map").then((m) => m.ActivationFieldActivityMap),
  {
    ssr: false,
    loading: () => (
      <BoneyardBlock name="visits-map-loading" loading variant="lines4" className="h-80 w-full">
        <span className="sr-only">Loading map</span>
      </BoneyardBlock>
    )
  }
);

export default function OpsVisitsMapPage(): ReactElement {
  const accessToken = useAuthStore((s) => s.accessToken);
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

  const filterParams = {
    limit: 500,
    ...(from ? { from: new Date(`${from}T00:00:00.000Z`).toISOString() } : {}),
    ...(to ? { to: new Date(`${to}T23:59:59.999Z`).toISOString() } : {}),
    ...(regionId ? { regionId } : {})
  };

  const visitsQuery = useQuery({
    queryKey: ["ops", "visits-map", filterParams],
    queryFn: async () => getVisitsMap(accessToken ?? "", filterParams),
    enabled: accessToken !== null
  });

  const filteredVisits = useMemo(() => {
    const rows = visitsQuery.data ?? [];
    if (!userId) return rows;
    return rows.filter((v) => v.user.id === userId);
  }, [visitsQuery.data, userId]);

  const roster = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of filteredVisits) {
      map.set(v.user.id, v.user.fullName);
    }
    return [...map.entries()].map(([id, fullName]) => ({ userId: id, fullName }));
  }, [filteredVisits]);

  const promoterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of visitsQuery.data ?? []) {
      map.set(v.user.id, v.user.fullName);
    }
    return [...map.entries()].map(([id, fullName]) => ({ id, fullName }));
  }, [visitsQuery.data]);

  const pings = useMemo(
    () =>
      filteredVisits.map((v) => ({
        id: v.id,
        userId: v.user.id,
        latitude: v.latitude,
        longitude: v.longitude,
        placeLabel: `${v.outlet.name}${v.isComplete ? "" : " (incomplete)"}`,
        recordedAt: v.checkedInAt
      })),
    [filteredVisits]
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Visits map</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Map of vendor visits across Ghana. Incomplete visits are labeled on the marker popup.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
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
                {promoterOptions.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card/80 shadow-sm">
        {visitsQuery.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading visits…</div>
        ) : pings.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No visits to map yet.</div>
        ) : (
          <ActivationFieldActivityMap roster={roster} pings={pings} />
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Showing {pings.length} visit{pings.length === 1 ? "" : "s"}.
      </p>
    </div>
  );
}
