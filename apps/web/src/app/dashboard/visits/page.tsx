"use client";

import { type ReactElement } from "react";

import { OutletVisitReports } from "@/components/outlet-visit-reports";

export default function ClientVisitsPage(): ReactElement {
  return (
    <OutletVisitReports
      queryKeyPrefix="client"
      title="Visit reports"
      description="Read-only visit reports: photos, questionnaire, footfall, visibility, and competitor intel."
      fallbackName="client-outlet-visits-report"
    />
  );
}
