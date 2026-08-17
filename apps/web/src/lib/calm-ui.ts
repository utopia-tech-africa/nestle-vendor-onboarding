/** Shared calm-theme controls (aligned with landing page accessibility). */

export const calmPrimaryButtonClass =
  "inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-xl bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "active:bg-primary/85 disabled:pointer-events-none disabled:opacity-50";

/** Primary action for toolbars / horizontal button groups (no full-width stretch). */
export const calmPrimaryButtonInlineClass =
  "inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "active:bg-primary/85 disabled:pointer-events-none disabled:opacity-50";

/** Secondary action for dashboard toolbars (stacked column). */
export const calmToolbarOutlineButtonClass =
  "inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:pointer-events-none disabled:opacity-50";

/** Secondary action in a horizontal toolbar row. */
export const calmToolbarOutlineButtonInlineClass =
  "inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:pointer-events-none disabled:opacity-50";

export const calmSecondaryButtonClass =
  "inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-xl border-2 border-border bg-card px-5 py-3 text-center text-sm font-semibold text-card-foreground shadow-sm transition-colors hover:border-primary/60 hover:bg-muted " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "active:bg-muted disabled:pointer-events-none disabled:opacity-50";

export const calmTextLinkClass =
  "font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/90 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm";

export const calmMutedLinkClass =
  "text-center text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm";
