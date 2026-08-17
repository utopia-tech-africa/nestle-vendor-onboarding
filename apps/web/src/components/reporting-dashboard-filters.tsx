"use client";

import { type ReactElement } from "react";

import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { calmPrimaryButtonInlineClass, calmToolbarOutlineButtonInlineClass } from "@/lib/calm-ui";
import { cn } from "@/lib/utils";

const SELECT_ALL = "__all__";

const filterFieldClass =
  "flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground sm:min-w-[9.5rem]";

export type ReportingActivationOption = {
  id: string;
  name: string;
};

export type ReportingRegionOption = {
  id: string;
  name: string;
};

type ReportingDashboardFiltersProps = {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  activationId: string;
  onActivationIdChange: (value: string) => void;
  activations: readonly ReportingActivationOption[];
  activationPlaceholder?: string;
  activationAllLabel?: string;
  regionId?: string;
  onRegionIdChange?: (value: string) => void;
  regions?: readonly ReportingRegionOption[];
  onLoad: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  isLoading: boolean;
  hasData: boolean;
  actionsDisabled?: boolean;
};

export const ReportingDashboardFilters = ({
  from,
  to,
  onFromChange,
  onToChange,
  activationId,
  onActivationIdChange,
  activations,
  activationPlaceholder = "All activations",
  activationAllLabel = "All activations",
  regionId,
  onRegionIdChange,
  regions,
  onLoad,
  onExportExcel,
  onExportPdf,
  isLoading,
  hasData,
  actionsDisabled = false
}: ReportingDashboardFiltersProps): ReactElement => {
  const showRegion = onRegionIdChange !== undefined && regions !== undefined;

  return (
    <section className="rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:gap-3">
        <label className={filterFieldClass}>
          From
          <DatePicker
            value={from}
            onChange={onFromChange}
            placeholder="From date"
            className="mt-0"
          />
        </label>
        <label className={filterFieldClass}>
          To
          <DatePicker value={to} onChange={onToChange} placeholder="To date" className="mt-0" />
        </label>
        <label className={cn(filterFieldClass, "sm:min-w-44 lg:flex-[1.25]")}>
          Activation
          <Select
            value={activationId.length > 0 ? activationId : SELECT_ALL}
            onValueChange={(value) => {
              onActivationIdChange(value === SELECT_ALL ? "" : value);
            }}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder={activationPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_ALL}>{activationAllLabel}</SelectItem>
              {activations.map((activation) => (
                <SelectItem key={activation.id} value={activation.id}>
                  {activation.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        {showRegion ? (
          <label className={cn(filterFieldClass, "sm:min-w-40")}>
            Region (city)
            <Select
              value={(regionId ?? "").length > 0 ? (regionId ?? "") : SELECT_ALL}
              onValueChange={(value) => {
                onRegionIdChange(value === SELECT_ALL ? "" : value);
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
        ) : null}
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:ml-auto">
          <button
            type="button"
            className={calmPrimaryButtonInlineClass}
            onClick={onLoad}
            disabled={actionsDisabled || isLoading}
          >
            {isLoading ? "Loading…" : "Load report"}
          </button>
          <button
            type="button"
            className={calmToolbarOutlineButtonInlineClass}
            disabled={actionsDisabled || !hasData}
            onClick={onExportExcel}
          >
            Excel
          </button>
          <button
            type="button"
            className={calmToolbarOutlineButtonInlineClass}
            disabled={actionsDisabled || !hasData}
            onClick={onExportPdf}
          >
            PDF
          </button>
        </div>
      </div>
    </section>
  );
};
