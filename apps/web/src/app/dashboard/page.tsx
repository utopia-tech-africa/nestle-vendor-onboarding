"use client";

import Link from "next/link";
import { type ReactElement } from "react";

import { BoneyardBlock } from "@/components/boneyard/boneyard-block";
import { getFieldNavItemsForUser } from "@/components/field-shell";
import { useAuthListSessions, useMeGetMe } from "@/lib/api/generated/client";
import { CHECK_IN_PATH, fieldCheckInHref } from "@/lib/field/check-in-deep-link";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseMeProfileFromOrval, parseSessionsFromOrval } from "@/lib/auth/orval-auth-adapter";
import { calmMutedLinkClass } from "@/lib/calm-ui";
import { cn } from "@/lib/utils";

export default function DashboardHomePage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isClient = user?.role === "client";

  const meQuery = useMeGetMe({
    query: {
      enabled: accessToken !== null,
      select: (result) => parseMeProfileFromOrval(result)
    }
  });

  const sessionsQuery = useAuthListSessions({
    query: {
      enabled: accessToken !== null,
      select: (result) => parseSessionsFromOrval(result)
    }
  });

  const shortcuts = user !== null ? getFieldNavItemsForUser(user).slice(1) : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Home</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isClient
            ? "Read-only Nestlé programme portal: KPIs, vendors, visits, map, and attendance."
            : "Onboard vendors, check in, and sync field activity for Nestlé Ghana."}
        </p>
      </div>

      <nav aria-label="Shortcuts">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {shortcuts.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href === CHECK_IN_PATH ? fieldCheckInHref({ source: "home" }) : href}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-4 text-center text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30 dark:bg-card/50"
                )}
              >
                <Icon className="size-6 text-primary" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {!isClient ? (
        <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
          <h2 className="text-base font-semibold text-foreground">Vendors</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Register koko vendors with photos, then record visits (questionnaire, footfall,
            visibility, competitors) on a separate screen — works offline and syncs when you
            reconnect.
          </p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/dashboard/outlet-visits/new" className={calmMutedLinkClass}>
              Add vendor
            </Link>
            <Link href="/dashboard/outlet-visits/visit" className={calmMutedLinkClass}>
              Record visit
            </Link>
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
          <h2 className="text-base font-semibold text-foreground">Agency portal</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Read-only Nestlé Ghana vendor onboarding: programme KPIs, vendors, visits, map, and
            promoter attendance. Field capture stays with promoters; supervisors manage ops.
          </p>
          <p className="mt-3">
            <Link href="/dashboard/programme" className={calmMutedLinkClass}>
              Open programme overview
            </Link>
          </p>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        <h2 className="text-base font-semibold text-foreground">Profile</h2>
        {meQuery.isError ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            Failed to load profile.
          </p>
        ) : null}
        <BoneyardBlock
          name="dashboard-profile"
          loading={meQuery.isLoading}
          variant="lines4"
          className="mt-2"
        >
          {meQuery.data ? (
            <dl className="mt-3 space-y-1 text-sm text-foreground/90">
              <div>
                <dt className="inline font-medium text-foreground">Name: </dt>
                <dd className="inline">{meQuery.data.fullName}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Phone: </dt>
                <dd className="inline">{meQuery.data.phone}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Role: </dt>
                <dd className="inline capitalize">{meQuery.data.role}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Region: </dt>
                <dd className="inline">
                  {meQuery.data.regionName ?? (meQuery.data.regionId !== null ? "—" : "Not set")}
                </dd>
              </div>
            </dl>
          ) : null}
        </BoneyardBlock>
      </section>

      <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        <h2 className="text-base font-semibold text-foreground">Sessions</h2>
        {sessionsQuery.isError ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            Failed to load sessions.
          </p>
        ) : null}
        <BoneyardBlock
          name="dashboard-sessions"
          loading={sessionsQuery.isLoading}
          variant="listRows"
          className="mt-2 min-h-[6rem]"
        >
          {sessionsQuery.data ? (
            <ul className="mt-3 space-y-2">
              {sessionsQuery.data.sessions.map((session) => (
                <li
                  key={session.id}
                  className="rounded-lg border border-border bg-muted/30 p-3 text-xs dark:bg-muted/15"
                >
                  <p className="font-medium text-foreground">
                    {session.isCurrent ? "Current session" : "Past session"}
                  </p>
                  <p className="text-muted-foreground">IP: {session.ipAddress ?? "Unknown"}</p>
                  <p className="text-muted-foreground">Active: {session.isActive ? "Yes" : "No"}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </BoneyardBlock>
      </section>
    </div>
  );
}
