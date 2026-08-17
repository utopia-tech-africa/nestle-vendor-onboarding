"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type PropsWithChildren, type ReactElement, useEffect } from "react";

import { BoneyardFullPageFallback } from "@/components/boneyard/boneyard-full-page-fallback";
import { FieldOfflineSyncListener } from "@/components/field-offline-sync-listener";
import { FieldShell } from "@/components/field-shell";
import { useGeofenceAutoClockOut } from "@/hooks/use-geofence-auto-clock-out";
import { useAuthSignOut, useMeGetFieldAttendance } from "@/lib/api/generated/client";
import { useAuthStore, useAuthStoreHydrated } from "@/lib/auth/auth-store";
import {
  useRedirectClientAwayFromFieldMutationRoutes
} from "@/lib/auth/use-redirect-client-from-field-mutation-routes";
import type { FieldAttendancePayload } from "@/lib/field/field-attendance";
import { CHECK_IN_PATH, fieldCheckInHref } from "@/lib/field/check-in-deep-link";
import { isOpsRole } from "@/lib/ops/ops-adapters";

export const DashboardLayoutClient = ({ children }: PropsWithChildren): ReactElement => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authHydrated = useAuthStoreHydrated();
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const signOutMutation = useAuthSignOut();

  useRedirectClientAwayFromFieldMutationRoutes();

  const isPromoter = user?.role === "promoter";
  const fieldAttendanceQuery = useMeGetFieldAttendance({
    query: {
      enabled: authHydrated && accessToken !== null && isPromoter,
      refetchInterval: 45_000,
      select: (raw) => raw as unknown as FieldAttendancePayload
    }
  });

  useGeofenceAutoClockOut({
    enabled: authHydrated && accessToken !== null && isPromoter,
    attendance: fieldAttendanceQuery.data
  });

  useEffect(() => {
    if (!authHydrated) {
      return;
    }
    if (accessToken !== null) {
      return;
    }

    const timer = window.setTimeout(() => {
      const latestState = useAuthStore.getState();
      if (latestState.accessToken !== null) {
        return;
      }
      const qs = searchParams.toString();
      const returnTo = qs.length > 0 ? `${pathname}?${qs}` : pathname;
      router.replace(`/auth/sign-in?redirect=${encodeURIComponent(returnTo)}`);
    }, 200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [authHydrated, accessToken, pathname, router, searchParams]);

  useEffect(() => {
    if (user !== null && isOpsRole(user.role)) {
      router.replace("/ops");
    }
  }, [user, router]);

  useEffect(() => {
    if (!isPromoter) {
      return;
    }
    const payload = fieldAttendanceQuery.data;
    if (payload === undefined || !payload.applicable) {
      return;
    }
    if (!payload.needsDailyClockIn && !payload.needsRecurringClockIn) {
      return;
    }
    if (pathname === CHECK_IN_PATH) {
      return;
    }
    router.replace(
      payload.needsDailyClockIn
        ? fieldCheckInHref({ dailyGate: "1" })
        : fieldCheckInHref({ recheck: "1" })
    );
  }, [fieldAttendanceQuery.data, isPromoter, pathname, router]);

  const gatePayload = fieldAttendanceQuery.data;
  const needsDailyClockIn = gatePayload?.applicable === true && gatePayload.needsDailyClockIn;
  const needsRecurringClockIn =
    gatePayload?.applicable === true && gatePayload.needsRecurringClockIn;
  const attendanceLocked = needsDailyClockIn || needsRecurringClockIn;
  /** Avoid one frame of dashboard before `router.replace` to check-in when the daily gate applies. */
  const fieldGatePending =
    isPromoter &&
    pathname !== CHECK_IN_PATH &&
    (fieldAttendanceQuery.isLoading || attendanceLocked);
  /** Lock nav until clock-in succeeds (or while first attendance fetch runs on check-in). */
  const attendanceGateLocked =
    isPromoter &&
    (attendanceLocked || (pathname === CHECK_IN_PATH && fieldAttendanceQuery.isLoading));

  const handleSignOut = (): void => {
    void (async () => {
      if (refreshToken !== null) {
        await signOutMutation.mutateAsync({ data: { refreshToken } }).catch(() => undefined);
      }
      clearSession();
      router.replace("/auth/sign-in");
    })();
  };

  if (!authHydrated || accessToken === null || user === null) {
    return <BoneyardFullPageFallback name="dashboard-auth-loading" />;
  }

  if (fieldGatePending) {
    return <BoneyardFullPageFallback name="dashboard-field-gate-loading" />;
  }

  if (isOpsRole(user.role)) {
    return <BoneyardFullPageFallback name="dashboard-redirect-ops" />;
  }

  return (
    <FieldShell
      user={user}
      onSignOut={handleSignOut}
      isSigningOut={signOutMutation.isPending}
      attendanceGateLocked={attendanceGateLocked}
      attendanceGateRecheck={needsRecurringClockIn}
    >
      <FieldOfflineSyncListener />
      {children}
    </FieldShell>
  );
};
