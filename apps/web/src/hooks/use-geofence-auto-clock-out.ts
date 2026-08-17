"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import { useNetworkOnline } from "@/hooks/use-network-online";
import { meUpdateMeLocation } from "@/lib/api/generated/client";
import type { FieldAttendancePayload } from "@/lib/field/field-attendance";
import { enqueueLocationPingForOfflineSync } from "@/lib/field/field-offline-enqueue";
import {
  type GeofenceWatchZone,
  isInsideAnyGeofenceWatchZone
} from "@/lib/geolocation/haversine-distance-meters";
import { toast } from "@/lib/toast";

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 15_000,
  timeout: 20_000
};

const POLL_INTERVAL_MS = 20_000;

type UseGeofenceAutoClockOutParams = {
  enabled: boolean;
  attendance: FieldAttendancePayload | undefined;
};

/**
 * While clocked in, watches GPS and auto clock-outs after the promoter stays outside
 * all configured work-area radii for `geofenceWatch.graceSeconds`.
 */
export const useGeofenceAutoClockOut = ({
  enabled,
  attendance
}: UseGeofenceAutoClockOutParams): void => {
  const queryClient = useQueryClient();
  const online = useNetworkOnline();
  const outsideSinceMsRef = useRef<number | null>(null);
  const clockOutInFlightRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  const watch = attendance?.geofenceWatch;
  const zones: GeofenceWatchZone[] = watch?.zones ?? [];
  const graceSeconds = watch?.graceSeconds ?? 60;
  const zonesKey = useMemo(
    () =>
      zones
        .map(
          (zone) =>
            `${zone.geofenceId}:${String(zone.centerLatitude)}:${String(zone.centerLongitude)}:${String(zone.radiusMeters)}`
        )
        .join("|"),
    [zones]
  );
  const shouldWatch =
    enabled &&
    attendance?.applicable === true &&
    attendance.suggestedNextAttendanceKind === "clock_out" &&
    watch?.enabled === true &&
    zones.length > 0;

  useEffect(() => {
    if (!shouldWatch) {
      outsideSinceMsRef.current = null;
      clockOutInFlightRef.current = false;
      if (watchIdRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    const triggerAutoClockOut = (latitude: number, longitude: number): void => {
      if (clockOutInFlightRef.current) {
        return;
      }
      clockOutInFlightRef.current = true;

      const payload = {
        latitude,
        longitude,
        attendanceKind: "clock_out" as const,
        autoClockOut: true
      };

      const finish = (): void => {
        outsideSinceMsRef.current = null;
        clockOutInFlightRef.current = false;
        void queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            (query.queryKey[0] === "/me/field-attendance" ||
              query.queryKey[0] === "/me/location/history")
        });
        toast.info("Clocked out automatically — you left the work area");
      };

      if (!online) {
        void (async () => {
          try {
            await enqueueLocationPingForOfflineSync(payload);
            finish();
          } catch {
            clockOutInFlightRef.current = false;
            toast.error("Could not save automatic clock-out on this device");
          }
        })();
        return;
      }

      void (async () => {
        try {
          await meUpdateMeLocation(payload);
          finish();
        } catch {
          clockOutInFlightRef.current = false;
          toast.error("Automatic clock-out could not be saved. Try manual clock-out.");
        }
      })();
    };

    const evaluatePosition = (latitude: number, longitude: number): void => {
      if (clockOutInFlightRef.current) {
        return;
      }

      const inside = isInsideAnyGeofenceWatchZone(latitude, longitude, zones);
      if (inside) {
        outsideSinceMsRef.current = null;
        return;
      }

      const now = Date.now();
      if (outsideSinceMsRef.current === null) {
        outsideSinceMsRef.current = now;
        return;
      }

      const outsideMs = now - outsideSinceMsRef.current;
      if (outsideMs >= graceSeconds * 1000) {
        triggerAutoClockOut(latitude, longitude);
      }
    };

    const onPosition: PositionCallback = (position) => {
      evaluatePosition(position.coords.latitude, position.coords.longitude);
    };

    const onPositionError = (): void => {
      void 0;
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      onPosition,
      onPositionError,
      WATCH_OPTIONS
    );

    const intervalId = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(onPosition, onPositionError, WATCH_OPTIONS);
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      outsideSinceMsRef.current = null;
      clockOutInFlightRef.current = false;
    };
  }, [shouldWatch, graceSeconds, online, queryClient, zonesKey]);
};
