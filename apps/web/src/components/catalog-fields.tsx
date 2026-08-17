"use client";

import { type ReactElement } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { CatalogOption } from "@/lib/outlet/field-catalogs";
import { toggleCatalogValue } from "@/lib/outlet/field-catalogs";

const SELECT_NONE = "__none__";

export function CatalogSelect({
  value,
  options,
  onValueChange,
  placeholder = "Select",
  allowEmpty = false,
  emptyLabel = "Select",
  triggerClassName = "mt-1 h-10 w-full"
}: {
  value: string;
  options: CatalogOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  triggerClassName?: string;
}): ReactElement {
  return (
    <Select
      value={value.length > 0 ? value : SELECT_NONE}
      onValueChange={(next) => {
        onValueChange(next === SELECT_NONE ? "" : next);
      }}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty ? <SelectItem value={SELECT_NONE}>{emptyLabel}</SelectItem> : null}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CatalogCheckboxGroup({
  options,
  selected,
  onChange,
  className = "mt-1 grid gap-2 sm:grid-cols-2"
}: {
  options: CatalogOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
}): ReactElement {
  return (
    <div className={className}>
      {options.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {
                onChange(toggleCatalogValue(selected, option.value));
              }}
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
