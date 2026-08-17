import type { GeofenceWatchZone } from "@/lib/geolocation/haversine-distance-meters";

/** Body returned by `GET /me/field-attendance` (matches API JSON). */
export type FieldAttendancePayload = {
  applicable: boolean;
  timezone: string;
  localDate: string;
  needsDailyClockIn: boolean;
  needsRecurringClockIn: boolean;
  suggestedNextAttendanceKind: "clock_in" | "clock_out";
  geofenceWatch?: {
    enabled: boolean;
    graceSeconds: number;
    zones: GeofenceWatchZone[];
  };
};
