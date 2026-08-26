"use client";

import {
  BarChart3,
  ClipboardCheck,
  Download,
  Gift,
  History,
  Home,
  Map,
  MapPin,
  Store,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type PropsWithChildren, type ReactElement, useState } from "react";

import { CalmBackground } from "@/components/calm-background";
import { PlatformLogo } from "@/components/platform-logo";
import { usePwaInstallContext } from "@/components/pwa-install-context";
import { useFieldOutboxCount } from "@/hooks/use-field-outbox-count";
import { useNetworkOnline } from "@/hooks/use-network-online";
import type { AuthUser } from "@/lib/auth/auth-types";
import { calmSecondaryButtonClass } from "@/lib/calm-ui";
import { cn } from "@/lib/utils";

export type FieldNavItem = {
  href: string;
  label: string;
  segment: "home" | "programme" | "vendors" | "visits" | "map" | "attendance" | "check-in" | "outlets" | "history" | "items";
  Icon: LucideIcon;
};

/** Field nav for Nestlé vendor onboarding (promoters). */
export const fieldNavItemsPromoter: readonly FieldNavItem[] = [
  { href: "/dashboard", label: "Home", segment: "home", Icon: Home },
  { href: "/dashboard/check-in", label: "Check-in", segment: "check-in", Icon: MapPin },
  { href: "/dashboard/outlet-visits", label: "Vendors", segment: "outlets", Icon: Store },
  { href: "/dashboard/items", label: "Items", segment: "items", Icon: Gift },
  { href: "/dashboard/history", label: "Route history", segment: "history", Icon: History }
] as const;

/** Read-only client / agency portal. */
export const fieldNavItemsClient: readonly FieldNavItem[] = [
  { href: "/dashboard", label: "Home", segment: "home", Icon: Home },
  { href: "/dashboard/programme", label: "Programme", segment: "programme", Icon: BarChart3 },
  { href: "/dashboard/vendors", label: "Vendors", segment: "vendors", Icon: Store },
  { href: "/dashboard/items", label: "Items given", segment: "items", Icon: Gift },
  { href: "/dashboard/visits", label: "Visits", segment: "visits", Icon: ClipboardCheck },
  { href: "/dashboard/visits-map", label: "Map", segment: "map", Icon: Map },
  {
    href: "/dashboard/attendance",
    label: "Attendance",
    segment: "attendance",
    Icon: History
  }
] as const;

export const getFieldNavItemsForUser = (user: AuthUser): readonly FieldNavItem[] =>
  user.role === "client" ? fieldNavItemsClient : fieldNavItemsPromoter;

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type FieldShellProps = PropsWithChildren<{
  user: AuthUser;
  onSignOut: () => void;
  isSigningOut: boolean;
  /** When true, hide field nav until the user completes the daily or recurring clock-in gate. */
  attendanceGateLocked?: boolean;
  /** Recurring 30-minute re-check (vs first clock-in of the day). */
  attendanceGateRecheck?: boolean;
}>;

export const FieldShell = ({
  children,
  user,
  onSignOut,
  isSigningOut,
  attendanceGateLocked = false,
  attendanceGateRecheck = false
}: FieldShellProps): ReactElement => {
  const pathname = usePathname();
  const online = useNetworkOnline();
  const isVendorSection = pathname.startsWith("/dashboard/outlet-visits");
  const outboxPendingCount = useFieldOutboxCount();
  const { showInstallEntry, openInstallUi } = usePwaInstallContext();
  const showConnectivityStrip = !online || outboxPendingCount > 0;
  const navItems = getFieldNavItemsForUser(user);
  const isClientPortal = user.role === "client";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const appLabel = isClientPortal ? "Agency" : "Field";
  const mobileGridClass =
    navItems.length <= 2
      ? "grid-cols-2"
      : navItems.length === 3
        ? "grid-cols-3"
        : navItems.length === 4
          ? "grid-cols-4"
          : navItems.length === 5
            ? "grid-cols-5"
            : "grid-cols-6";

  const linkClass = (href: string): string =>
    [
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      isNavActive(pathname, href)
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    ].join(" ");

  return (
    <div className="relative h-dvh overflow-hidden bg-background">
      <CalmBackground />
      <div className="relative z-10 flex h-dvh min-h-0 flex-row overflow-hidden">
        {!attendanceGateLocked ? (
          <>
            {isClientPortal && mobileNavOpen ? (
              <button
                type="button"
                className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
                aria-label="Close menu"
                onClick={() => {
                  setMobileNavOpen(false);
                }}
              />
            ) : null}
            <aside
              className={cn(
                "h-dvh w-60 shrink-0 flex-col overflow-hidden border-r border-border bg-card/90 backdrop-blur-sm dark:bg-card/70",
                isClientPortal
                  ? cn(
                      "fixed inset-y-0 left-0 z-50 flex w-[min(100%,18rem)] shadow-lg transition-transform md:static md:w-60 md:shadow-none",
                      !mobileNavOpen && "-translate-x-full md:translate-x-0"
                    )
                  : "max-lg:hidden! lg:flex"
              )}
            >
              <div className="flex h-14 shrink-0 items-center border-b border-border px-3">
                <PlatformLogo href="/dashboard" size="sm" badge={appLabel} className="min-w-0" />
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <nav
                  className="min-h-0 flex-1 overflow-y-auto p-3 pb-2"
                  aria-label="Field app primary navigation"
                >
                  <ul className="flex flex-col gap-1">
                    {navItems.map(({ href, label, Icon }) => (
                      <li key={href}>
                        <Link
                          href={href}
                          className={linkClass(href)}
                          onClick={() => {
                            setMobileNavOpen(false);
                          }}
                        >
                          <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="shrink-0 border-t border-border p-3 pt-4">
                  <p className="truncate px-3 text-xs text-muted-foreground" title={user.fullName}>
                    {user.fullName}
                  </p>
                  <p className="truncate px-3 text-xs capitalize text-foreground">{user.role}</p>
                  {showInstallEntry ? (
                    <button
                      type="button"
                      className={`${calmSecondaryButtonClass} mt-3`}
                      onClick={openInstallUi}
                    >
                      <Download className="mr-2 inline size-4" aria-hidden />
                      Install app
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`${calmSecondaryButtonClass} mt-3`}
                    disabled={isSigningOut}
                    onClick={onSignOut}
                  >
                    {isSigningOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </div>
            </aside>
          </>
        ) : (
          <aside className="max-lg:hidden! h-dvh w-52 shrink-0 flex-col border-r border-border bg-card/90 px-4 py-4 backdrop-blur-sm lg:flex dark:bg-card/70">
            <PlatformLogo href="/dashboard/check-in" size="sm" className="max-w-full" />
            <p className="mt-3 text-xs leading-snug text-muted-foreground">
              {attendanceGateRecheck
                ? "Re-check in with GPS and a selfie every 30 minutes to keep working. You can sign out if you need to leave."
                : "Clock in to unlock the rest of the app for today. You can sign out if you need to leave."}
            </p>
            <div className="mt-auto border-t border-border pt-4">
              <p className="truncate text-xs text-muted-foreground" title={user.fullName}>
                {user.fullName}
              </p>
              <button
                type="button"
                className={`${calmSecondaryButtonClass} mt-3 w-full`}
                disabled={isSigningOut}
                onClick={onSignOut}
              >
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </aside>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header
            className={[
              "z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm",
              isClientPortal ? "md:hidden" : "lg:hidden"
            ].join(" ")}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {isClientPortal && !attendanceGateLocked ? (
                <button
                  type="button"
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
                  aria-expanded={mobileNavOpen}
                  onClick={() => {
                    setMobileNavOpen((open) => !open);
                  }}
                >
                  Menu
                </button>
              ) : null}
              <div className="min-w-0">
                {attendanceGateLocked ? (
                  <p className="truncate text-sm font-semibold text-foreground">
                    {attendanceGateRecheck
                      ? "Re-check in (every 30 minutes)"
                      : "Clock in required"}
                  </p>
                ) : (
                  <PlatformLogo
                    href="/dashboard"
                    size="sm"
                    showWordmark={false}
                    className="max-w-32"
                  />
                )}
                <p className="truncate text-xs text-muted-foreground">{user.fullName}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {showInstallEntry ? (
                <button
                  type="button"
                  className={cn(calmSecondaryButtonClass, "size-10 max-w-none shrink-0 px-0 py-0")}
                  aria-label="Install app"
                  onClick={openInstallUi}
                >
                  <Download className="size-4" aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                className={cn(
                  calmSecondaryButtonClass,
                  "max-w-36 shrink-0 px-3 py-2 text-xs sm:text-sm"
                )}
                disabled={isSigningOut}
                onClick={onSignOut}
              >
                {isSigningOut ? "…" : "Sign out"}
              </button>
            </div>
          </header>

          {showConnectivityStrip ? (
            <div
              role="status"
              className="shrink-0 border-b border-border bg-muted/50 px-4 py-2 text-center text-xs leading-snug text-muted-foreground sm:text-sm"
            >
              {!online ? (
                <>
                  You appear to be offline. This screen may be out of date, and new visits or
                  clock-ins are saved on this device first, then sent when you are back online.
                </>
              ) : (
                <>
                  {outboxPendingCount === 1
                    ? "You have 1 field record waiting to sync. It will send automatically."
                    : `You have ${String(outboxPendingCount)} field records waiting to sync. They will send automatically.`}
                </>
              )}
            </div>
          ) : null}

          <main
            className={cn(
              "mx-auto min-h-0 w-full flex-1 overflow-y-auto overscroll-y-contain",
              isClientPortal
                ? "max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
                : isVendorSection
                  ? "max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
                  : "max-w-2xl px-4 py-5 sm:px-6 sm:py-6 lg:max-w-4xl lg:px-8",
              attendanceGateLocked || isClientPortal
                ? "pb-8"
                : "pb-[calc(6.25rem+env(safe-area-inset-bottom,0))] lg:pb-8"
            )}
          >
            {children}
          </main>

          {!attendanceGateLocked && !isClientPortal ? (
            <nav
              className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm lg:hidden dark:bg-card/90"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
              aria-label="Field app tabs"
            >
              <ul className={cn("grid w-full px-2 pt-2", mobileGridClass)}>
                {navItems.map(({ href, label, Icon }) => {
                  const active = isNavActive(pathname, href);
                  return (
                    <li key={href} className="min-w-0">
                      <Link
                        href={href}
                        className={cn(
                          "flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-2.5 text-xs font-medium",
                          active
                            ? "text-primary"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <Icon className="size-8 shrink-0" strokeWidth={1.75} aria-hidden />
                        <span className="max-w-full truncate px-1">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
};
