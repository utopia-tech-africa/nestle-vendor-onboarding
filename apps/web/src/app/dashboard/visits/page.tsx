"use client";

import { type ReactElement } from "react";

import { OutletVisitReports } from "@/components/outlet-visit-reports";

export default function ClientVisitsPage(): ReactElement {
  return (
    <OutletVisitReports
      queryKeyPrefix="client"
      title="Visit reports"
      description="Onboarding captures questionnaire, stall intel, and photos. Later visits record items given."
      fallbackName="client-outlet-visits-report"
    />
  );
}
