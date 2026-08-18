"use client";

import { type ReactElement } from "react";

import { Button } from "@/components/ui/button";

export function ListPagination({
  page,
  pageCount,
  onPageChange,
  label
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label?: string;
}): ReactElement | null {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      {label !== undefined && label.length > 0 ? (
        <p className="text-xs text-muted-foreground">{label}</p>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => {
            onPageChange(page - 1);
          }}
        >
          Previous
        </Button>
        <p className="text-xs text-muted-foreground">
          Page {String(page)} of {String(pageCount)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => {
            onPageChange(page + 1);
          }}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
