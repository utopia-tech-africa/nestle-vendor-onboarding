"use client";

import { format } from "date-fns";
import { type ReactElement, useMemo, useState } from "react";

import { AttendanceDailyDashboard } from "@/components/attendance-daily-dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  useAdminAttendanceGetDailySummary,
  useAdminRegionListRegions
} from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseAdminAttendanceDailySummaryFromOrval } from "@/lib/ops/ops-attendance-adapters";
import { type RegionRow, parseRegionsFromOrval } from "@/lib/ops/ops-adapters";

const SELECT_ALL = "__all__";

const filterFieldClass =
  "flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground sm:min-w-40";

export default function OpsAttendancePage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [regionId, setRegionId] = useState<string>("");

  const regionsQuery = useAdminRegionListRegions({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseRegionsFromOrval(r)
    }
  });

  const summaryParams = useMemo(
    () => ({
      date,
      ...(regionId.trim().length > 0 ? { regionId: regionId.trim() } : {})
    }),
    [date, regionId]
  );

  const summaryQuery = useAdminAttendanceGetDailySummary(summaryParams, {
    query: {
      enabled: accessToken !== null && date.length === 10,
      select: (r) => parseAdminAttendanceDailySummaryFromOrval(r)
    }
  });

  const regions: RegionRow[] = regionsQuery.data ?? [];

  return (
    <AttendanceDailyDashboard
      title="Daily attendance"
      description='Roll-up for field staff (promoters) by calendar day. Boundaries and "late" use the API ATTENDANCE_TIMEZONE and ATTENDANCE_EXPECTED_CHECK_IN_HHMM.'
      date={date}
      onDateChange={setDate}
      isLoading={summaryQuery.isLoading}
      isError={summaryQuery.isError}
      isFetching={summaryQuery.isFetching}
      onRefresh={() => {
        void summaryQuery.refetch();
      }}
      onToday={() => {
        setDate(format(new Date(), "yyyy-MM-dd"));
      }}
      data={summaryQuery.data}
      filterSlot={
        <label className={filterFieldClass}>
          Region (optional)
          <Select
            value={regionId.length > 0 ? regionId : SELECT_ALL}
            onValueChange={(value) => {
              setRegionId(value === SELECT_ALL ? "" : value);
            }}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="All regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_ALL}>All regions</SelectItem>
              {regions.map((region) => (
                <SelectItem key={region.id} value={region.id}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      }
    />
  );
}
