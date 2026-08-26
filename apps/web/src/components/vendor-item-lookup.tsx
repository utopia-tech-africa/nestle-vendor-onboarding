"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, type SyntheticEvent, useState } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { formatApiErrorMessage } from "@/lib/api/format-api-error";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  calmPrimaryButtonInlineClass,
  calmToolbarOutlineButtonInlineClass
} from "@/lib/calm-ui";
import { vendorTypeDisplayLabel } from "@/lib/outlet/field-catalogs";
import {
  createDistributionItem,
  deleteDistributionItem,
  getVendorItemsByOutletId,
  lookupVendorItems,
  markVendorItemGiven,
  revokeVendorItemGiven,
  updateDistributionItem,
  listDistributionItems,
  vendorLabel,
  type CatalogItemRecord,
  type VendorItemLookup,
  type VendorItemMatch
} from "@/lib/outlet/outlet-api";
import { toast } from "@/lib/toast";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";
const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const itemsQueryKey = ["distribution", "items"] as const;

const formatIssuedAt = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const formatMatchLine = (match: VendorItemMatch): string => {
  const parts = [
    match.contactPhone,
    match.contactPhoneSecondary,
    match.district,
    match.locationArea
  ].filter((part): part is string => part != null && part.length > 0);
  return parts.join(" · ");
};

const CatalogItemRow = ({
  row,
  onSave,
  onDelete,
  busy
}: {
  row: CatalogItemRecord;
  onSave: (id: string, name: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}): ReactElement => {
  const [name, setName] = useState(row.name);
  const [isActive, setIsActive] = useState(row.isActive);
  const dirty = name.trim() !== row.name || isActive !== row.isActive;

  return (
    <li className="rounded-lg border border-border bg-muted/20 p-3 dark:bg-muted/10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className={`${inputClass} mt-0`}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => {
              setIsActive(event.target.checked);
            }}
          />
          Active
        </label>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className={calmPrimaryButtonInlineClass}
            disabled={busy || !dirty || name.trim().length === 0}
            onClick={() => {
              onSave(row.id, name.trim(), isActive);
            }}
          >
            Save
          </button>
          <button
            type="button"
            className={calmToolbarOutlineButtonInlineClass}
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Delete “${row.name}”? Existing given records for this item will be removed.`)) {
                onDelete(row.id);
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
};

export function VendorItemLookup({
  canRecord,
  canManageCatalog
}: {
  canRecord: boolean;
  canManageCatalog: boolean;
}): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [phoneInput, setPhoneInput] = useState("");
  const [lookup, setLookup] = useState<VendorItemLookup | null>(null);
  const [matches, setMatches] = useState<VendorItemMatch[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");

  const catalogQuery = useQuery({
    queryKey: [...itemsQueryKey, canManageCatalog ? "all" : "active"] as const,
    queryFn: async () => listDistributionItems(accessToken ?? "", canManageCatalog),
    enabled: accessToken !== null
  });

  const lookupMutation = useMutation({
    mutationFn: async (query: string) => lookupVendorItems(accessToken ?? "", query),
    onSuccess: (data) => {
      setLookup(data.result);
      setMatches(data.matches);
      setLookupError(null);
    },
    onError: (error: unknown) => {
      setLookup(null);
      setMatches([]);
      setLookupError(formatApiErrorMessage(error, "Could not find that vendor."));
    }
  });

  const loadByIdMutation = useMutation({
    mutationFn: async (outletId: string) => getVendorItemsByOutletId(accessToken ?? "", outletId),
    onSuccess: (data) => {
      setLookup(data);
      setLookupError(null);
    },
    onError: (error: unknown) => {
      toast.error(formatApiErrorMessage(error, "Could not load that vendor."));
    }
  });

  const applyLookup = (data: VendorItemLookup): void => {
    setLookup(data);
  };

  const refreshLookup = (): void => {
    if (lookup === null) {
      return;
    }
    loadByIdMutation.mutate(lookup.outlet.id);
  };

  const markMutation = useMutation({
    mutationFn: async (payload: { outletId: string; itemId: string; given: boolean }) => {
      if (payload.given) {
        return markVendorItemGiven(accessToken ?? "", payload.outletId, payload.itemId);
      }
      return revokeVendorItemGiven(accessToken ?? "", payload.outletId, payload.itemId);
    },
    onSuccess: (data) => {
      applyLookup(data);
      toast.success("Item record updated");
    },
    onError: (error: unknown) => {
      toast.error(formatApiErrorMessage(error, "Could not update item record."));
    }
  });

  const invalidateCatalog = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: itemsQueryKey });
  };

  const createItemMutation = useMutation({
    mutationFn: async (name: string) => createDistributionItem(accessToken ?? "", { name }),
    onSuccess: async () => {
      setNewItemName("");
      await invalidateCatalog();
      toast.success("Item added");
      refreshLookup();
    },
    onError: (error: unknown) => {
      toast.error(formatApiErrorMessage(error, "Could not add item."));
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; isActive: boolean }) =>
      updateDistributionItem(accessToken ?? "", payload.id, {
        name: payload.name,
        isActive: payload.isActive
      }),
    onSuccess: async () => {
      await invalidateCatalog();
      toast.success("Item updated");
      refreshLookup();
    },
    onError: (error: unknown) => {
      toast.error(formatApiErrorMessage(error, "Could not update item."));
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => deleteDistributionItem(accessToken ?? "", id),
    onSuccess: async () => {
      await invalidateCatalog();
      toast.success("Item deleted");
      refreshLookup();
    },
    onError: (error: unknown) => {
      toast.error(formatApiErrorMessage(error, "Could not delete item."));
    }
  });

  const onLookup = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const query = phoneInput.trim();
    if (query.length === 0) {
      setLookupError("Enter a phone number (for example 0244123456).");
      setLookup(null);
      setMatches([]);
      return;
    }
    lookupMutation.mutate(query);
  };

  const catalogBusy =
    createItemMutation.isPending ||
    updateItemMutation.isPending ||
    deleteItemMutation.isPending;
  const recordBusy = markMutation.isPending;
  const showMatchPicker = lookup === null && matches.length > 1;

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Look up vendor</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter her phone number. Then tick each item you have given her.
        </p>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={onLookup}>
          <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
            Phone number
            <input
              className={inputClass}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phoneInput}
              onChange={(event) => {
                setPhoneInput(event.target.value);
              }}
              placeholder="e.g. 0244123456"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <button type="submit" className={calmPrimaryButtonInlineClass} disabled={lookupMutation.isPending}>
            {lookupMutation.isPending ? "Looking up…" : "Look up"}
          </button>
        </form>
        {lookupError !== null ? <p className="mt-3 text-sm text-destructive">{lookupError}</p> : null}
      </section>

      {showMatchPicker ? (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Several vendors match</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose the right one, then tick the items given.</p>
          <ul className="mt-4 space-y-2">
            {matches.map((match) => (
              <li key={match.id}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-3 text-left dark:bg-muted/10"
                  disabled={loadByIdMutation.isPending}
                  onClick={() => {
                    loadByIdMutation.mutate(match.id);
                  }}
                >
                  <p className="font-medium text-foreground">
                    {vendorLabel({ vendorCode: match.vendorCode, name: match.name })}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatMatchLine(match)}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lookup !== null ? (
        <section className={cardClass}>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-xs text-muted-foreground">{lookup.outlet.vendorCode}</p>
              <h2 className="text-lg font-semibold text-foreground">
                {vendorLabel({ vendorCode: lookup.outlet.vendorCode, name: lookup.outlet.name })}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {vendorTypeDisplayLabel(lookup.outlet)}
                {lookup.outlet.district != null && lookup.outlet.district.length > 0
                  ? ` · ${lookup.outlet.district}`
                  : ""}
                {lookup.outlet.locationArea.length > 0 ? ` · ${lookup.outlet.locationArea}` : ""}
              </p>
              {lookup.outlet.contactName != null && lookup.outlet.contactName.length > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">{lookup.outlet.contactName}</p>
              ) : null}
              {lookup.outlet.contactPhone != null && lookup.outlet.contactPhone.length > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">{lookup.outlet.contactPhone}</p>
              ) : null}
            </div>
            <p
              className={[
                "mt-2 shrink-0 rounded-md px-2 py-1 text-xs font-medium sm:mt-0",
                lookup.itemCount === 0
                  ? "bg-muted text-muted-foreground"
                  : lookup.givenCount === lookup.itemCount
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : lookup.givenCount === 0
                      ? "bg-amber-500/15 text-amber-800 dark:text-amber-400"
                      : "bg-sky-500/15 text-sky-800 dark:text-sky-400"
              ].join(" ")}
            >
              {lookup.itemCount === 0
                ? "No items configured"
                : lookup.givenCount === 0
                  ? "Not given"
                  : lookup.givenCount === lookup.itemCount
                    ? "All items given"
                    : `Given ${String(lookup.givenCount)} of ${String(lookup.itemCount)}`}
            </p>
          </div>

          {lookup.items.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Add the items you give vendors below, then look this vendor up again.
            </p>
          ) : (
            <fieldset className="mt-4 min-w-0 border-0 p-0">
              <legend className="text-sm font-medium text-foreground">
                {canRecord ? "Tick each item you have given her" : "Items given"}
              </legend>
              <ul className="mt-2 space-y-2">
                {lookup.items.map((item) => (
                  <li key={item.id}>
                    <label
                      className={[
                        "flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 dark:bg-muted/10",
                        item.given ? "border-emerald-500/40 bg-emerald-500/5" : "",
                        !canRecord ? "cursor-default" : ""
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 size-5 shrink-0 accent-primary"
                        checked={item.given}
                        disabled={!canRecord || recordBusy}
                        onChange={(event) => {
                          const given = event.target.checked;
                          if (!given && item.given) {
                            if (!window.confirm(`Mark “${item.name}” as not given?`)) {
                              return;
                            }
                          }
                          markMutation.mutate({
                            outletId: lookup.outlet.id,
                            itemId: item.id,
                            given
                          });
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-foreground">{item.name}</span>
                        {item.given ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            Given
                            {item.issuedAt !== null ? ` · ${formatIssuedAt(item.issuedAt)}` : ""}
                            {item.issuedByName !== null ? ` · ${item.issuedByName}` : ""}
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-xs text-muted-foreground">Not given yet</span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
        </section>
      ) : null}

      {canManageCatalog ? (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-foreground">Items you give</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These appear as a checklist when you look up a vendor. Add umbrellas, tables, poster packs, or
            anything else the team hands out.
          </p>
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              const name = newItemName.trim();
              if (name.length === 0) return;
              createItemMutation.mutate(name);
            }}
          >
            <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
              New item
              <input
                className={inputClass}
                value={newItemName}
                onChange={(event) => {
                  setNewItemName(event.target.value);
                }}
                placeholder="e.g. Cooler box"
              />
            </label>
            <button type="submit" className={calmPrimaryButtonInlineClass} disabled={catalogBusy}>
              Add
            </button>
          </form>
          {catalogQuery.isLoading ? (
            <BoneyardInlineFallback name="distribution-items" className="mt-4 min-h-24" />
          ) : null}
          {catalogQuery.isError ? (
            <p className="mt-3 text-sm text-destructive">Could not load items.</p>
          ) : null}
          {catalogQuery.data !== undefined ? (
            <ul className="mt-4 space-y-2">
              {catalogQuery.data.map((row) => (
                <CatalogItemRow
                  key={row.id}
                  row={row}
                  busy={catalogBusy}
                  onSave={(id, name, isActive) => {
                    updateItemMutation.mutate({ id, name, isActive });
                  }}
                  onDelete={(id) => {
                    deleteItemMutation.mutate(id);
                  }}
                />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
