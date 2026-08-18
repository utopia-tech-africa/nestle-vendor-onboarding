"use client";

import { type ReactElement, useMemo, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export type SearchableSelectOption = {
  value: string;
  label: string;
  keywords?: string;
};

const matchesQuery = (option: SearchableSelectOption, query: string): boolean => {
  if (query.length === 0) {
    return true;
  }
  const hay = `${option.label} ${option.keywords ?? ""}`.toLowerCase();
  return hay.includes(query);
};

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select",
  searchPlaceholder = "Search…",
  emptyMessage = "No matches",
  triggerClassName = "mt-1 h-10 w-full"
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  triggerClassName?: string;
}): ReactElement {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const visibleOptions = useMemo(() => {
    return options.filter(
      (option) => option.value === value || matchesQuery(option, normalizedQuery)
    );
  }, [normalizedQuery, options, value]);

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      onOpenChange={(open) => {
        if (!open) {
          setQuery("");
        }
      }}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="sticky top-0 z-10 bg-popover pb-1">
          <input
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>
        {visibleOptions.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          visibleOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
