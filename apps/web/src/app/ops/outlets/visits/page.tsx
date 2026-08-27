"use client";

import { type ReactElement } from "react";

import { OutletVisitReports } from "@/components/outlet-visit-reports";

export default function OpsOutletVisitsReportPage(): ReactElement {
  return (
    <OutletVisitReports
      queryKeyPrefix="ops"
      title="Vendor visit reports"
      description="Filter visits by vendor, promoter, and date. Onboarding visits include questionnaire and stall intel; later visits show items given."
      fallbackName="ops-outlet-visits-report"
    />
  );
}
