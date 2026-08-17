"use client";

import Link from "next/link";
import { type ReactElement } from "react";

import { useAuthStore } from "@/lib/auth/auth-store";
import { calmMutedLinkClass } from "@/lib/calm-ui";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";

type OrgCardProps = {
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
};

const OrgCard = ({ title, description, href, linkLabel }: OrgCardProps): ReactElement => (
  <div className={cardClass}>
    <h2 className="font-semibold text-foreground">{title}</h2>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    {href !== undefined && linkLabel !== undefined ? (
      <p className="mt-3">
        <Link href={href} className={calmMutedLinkClass}>
          {linkLabel}
        </Link>
      </p>
    ) : null}
  </div>
);

export default function OpsOrganizationPage(): ReactElement {
  const role = useAuthStore((state) => state.user?.role);
  const canSuperviseField = role === "admin" || role === "supervisor";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Organization</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Nestlé Ghana vendor onboarding — territories, people, questionnaires, and field
          monitoring.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Structure & people
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <OrgCard
            title="Regions"
            description="Territories used for vendors, KPIs, and map filters."
            href="/ops/regions"
            linkLabel="Open regions →"
          />
          <OrgCard
            title="Users & roles"
            description="Invite promoters and clients, assign supervisors, and manage sessions."
            href="/ops/users"
            linkLabel="Open users →"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Field operations
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <OrgCard
            title="Work areas"
            description="Circular geofences for promoter check-in validation when enforced."
            href="/ops/geofences"
            linkLabel="Open work areas →"
          />
          <OrgCard
            title="Vendors"
            description="Vendor master data — business, contact, district, community, region, GPS."
            href="/ops/outlets"
            linkLabel="Open vendors →"
          />
          <OrgCard
            title="Vendor visit reports"
            description="Photos, questionnaire, footfall, visibility, and competitor intel."
            href="/ops/outlets/visits"
            linkLabel="Open visit reports →"
          />
          {canSuperviseField ? (
            <>
              <OrgCard
                title="Questionnaires"
                description="Seed or edit the active visit questionnaire without an app update."
                href="/ops/questionnaires"
                linkLabel="Open questionnaires →"
              />
              <OrgCard
                title="Products & competitors"
                description="Nestlé products and competitor brands/products used as visit-form dropdowns."
                href="/ops/catalogs"
                linkLabel="Open catalogs →"
              />
              <OrgCard
                title="Visits map"
                description="Map all vendor visit GPS points with date and region filters."
                href="/ops/visits-map"
                linkLabel="Open visits map →"
              />
              <OrgCard
                title="Alerts"
                description="New vendors, incomplete visits, sync failures, and missed check-ins."
                href="/ops/alerts"
                linkLabel="Open alerts →"
              />
              <OrgCard
                title="Attendance"
                description="Daily roll-up including total working hours."
                href="/ops/attendance"
                linkLabel="Open attendance →"
              />
              <OrgCard
                title="Live tracking"
                description="Real-time map and table of latest field positions."
                href="/ops/tracking"
                linkLabel="Open live tracking →"
              />
            </>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Reporting
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <OrgCard
            title="Nestlé overview"
            description="Primary KPIs, filters, and CSV export for vendor onboarding performance."
            href="/ops"
            linkLabel="Open overview →"
          />
        </div>
      </section>
    </div>
  );
}
