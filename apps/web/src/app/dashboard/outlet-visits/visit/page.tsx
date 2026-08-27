"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ReactElement, type SyntheticEvent, useEffect, useMemo, useState } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { OutletMapPreview } from "@/components/outlet-map-preview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useNetworkOnline } from "@/hooks/use-network-online";
import { formatApiErrorMessage } from "@/lib/api/format-api-error";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmMutedLinkClass, calmPrimaryButtonClass, calmPrimaryButtonInlineClass } from "@/lib/calm-ui";
import { enqueueOutletVisitForOfflineSync } from "@/lib/field/field-offline-enqueue";
import { requestCurrentPosition } from "@/lib/geolocation/request-current-position";
import {
  createOutletVisit,
  getVendorItemsByOutletId,
  listDistributionItems,
  lookupVendorItems,
  vendorLabel,
  type CreateOutletVisitPayload,
  type VendorItemLookup,
  type VendorItemMatch
} from "@/lib/outlet/outlet-api";
import { toast } from "@/lib/toast";

import { ItemsGivenFields } from "../field-intel-sections";
import { SELECT_NONE, fieldVendorInputClass, fieldVendorPageClass } from "../field-vendor-shared";
import { useFieldVendorOptions } from "../use-field-vendor-options";

function RecordItemsVisitPageInner(): ReactElement {
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((state) => state.accessToken);
  const online = useNetworkOnline();
  const { vendorOptions } = useFieldVendorOptions(accessToken);

  const outletIdFromUrl = searchParams.get("outletId")?.trim() ?? "";
  const [pickedOutletId, setPickedOutletId] = useState<string | null>(null);
  const [prevOutletIdFromUrl, setPrevOutletIdFromUrl] = useState(outletIdFromUrl);
  if (outletIdFromUrl !== prevOutletIdFromUrl) {
    setPrevOutletIdFromUrl(outletIdFromUrl);
    setPickedOutletId(null);
  }
  const outletId = pickedOutletId ?? outletIdFromUrl;
  const [phoneInput, setPhoneInput] = useState("");
  const [lookup, setLookup] = useState<VendorItemLookup | null>(null);
  const [matches, setMatches] = useState<VendorItemMatch[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [issuedItemIds, setIssuedItemIds] = useState<string[]>([]);
  const [isCapturingVisitLocation, setIsCapturingVisitLocation] = useState(false);

  const itemsQuery = useQuery({
    queryKey: ["distribution", "items", "active"] as const,
    queryFn: async () => listDistributionItems(accessToken ?? "", false),
    enabled: accessToken !== null
  });

  const selectedOutlet = useMemo(() => {
    if (!outletId) return null;
    return vendorOptions.find((row) => row.id === outletId) ?? null;
  }, [outletId, vendorOptions]);

  const applyLookup = (data: VendorItemLookup): void => {
    setLookup(data);
    setIssuedItemIds(data.items.filter((item) => item.given).map((item) => item.id));
    setLookupError(null);
    setPickedOutletId(data.outlet.id);
  };

  const lookupMutation = useMutation({
    mutationFn: async (query: string) => lookupVendorItems(accessToken ?? "", query),
    onSuccess: (data) => {
      setMatches(data.matches);
      if (data.result !== null) {
        applyLookup(data.result);
        return;
      }
      setLookup(null);
      setLookupError(null);
    },
    onError: (error: unknown) => {
      setLookup(null);
      setMatches([]);
      setLookupError(formatApiErrorMessage(error, "Could not find that vendor."));
    }
  });

  const loadByIdMutation = useMutation({
    mutationFn: async (id: string) => getVendorItemsByOutletId(accessToken ?? "", id),
    onSuccess: applyLookup,
    onError: (error: unknown) => {
      toast.error(formatApiErrorMessage(error, "Could not load that vendor."));
    }
  });

  useEffect(() => {
    if (accessToken === null || outletIdFromUrl.length === 0) {
      return;
    }
    loadByIdMutation.mutate(outletIdFromUrl);
    // Load once when the URL vendor id is set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, outletIdFromUrl]);

  const createVisitMutation = useMutation({
    mutationFn: async (payload: CreateOutletVisitPayload) =>
      createOutletVisit(accessToken ?? "", payload)
  });

  const resolvedOutletId = lookup?.outlet.id ?? (outletId.length > 0 ? outletId : "");

  const onPhoneLookup = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const query = phoneInput.trim();
    if (query.length === 0) {
      setLookupError("Enter a phone number (for example 0244123456).");
      return;
    }
    lookupMutation.mutate(query);
  };

  const handleSubmitVisit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (resolvedOutletId.length === 0) {
      toast.error("Select a vendor first.");
      return;
    }
    setIsCapturingVisitLocation(true);
    void (async () => {
      const position = await requestCurrentPosition();
      setIsCapturingVisitLocation(false);
      if (!position.ok) {
        toast.error(position.message);
        return;
      }
      const payload: CreateOutletVisitPayload = {
        outletId: resolvedOutletId,
        kind: "items",
        latitude: position.latitude,
        longitude: position.longitude,
        ...(issuedItemIds.length > 0 ? { issuedItemIds } : {})
      };

      if (!online) {
        try {
          await enqueueOutletVisitForOfflineSync(payload);
          toast.success("Items visit saved offline. It will sync when you are back online.");
        } catch {
          toast.error("Could not save visit offline.");
        }
        return;
      }

      createVisitMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Items given recorded.");
          if (resolvedOutletId.length > 0) {
            loadByIdMutation.mutate(resolvedOutletId);
          }
        },
        onError: (error: unknown) => {
          if (error instanceof ApiError && error.status === 0) {
            void enqueueOutletVisitForOfflineSync(payload).then(() => {
              toast.success("Items visit saved offline. It will sync when you are back online.");
            });
            return;
          }
          toast.error(formatApiErrorMessage(error, "Could not record items given."));
        }
      });
    })();
  };

  if (accessToken === null) {
    return <BoneyardInlineFallback name="field-record-visit-auth" className="min-h-32" />;
  }

  const selectedVendorLabel = selectedOutlet
    ? `${vendorLabel(selectedOutlet)}${selectedOutlet.locationArea ? ` · ${selectedOutlet.locationArea}` : ""}`
    : lookup
      ? vendorLabel(lookup.outlet)
      : null;
  const showMatchPicker = lookup === null && matches.length > 1;
  const catalogItems = lookup?.items ?? itemsQuery.data ?? [];

  return (
    <div className={fieldVendorPageClass}>
      <div>
        <p className="text-sm">
          <Link href="/dashboard/outlet-visits" className={calmMutedLinkClass}>
            Back to vendors
          </Link>
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Items given</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Look up a vendor by phone or pick her from the list, tick the items you have given her, then
          save with GPS.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={onPhoneLookup}>
          <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
            Phone number
            <input
              className={fieldVendorInputClass}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phoneInput}
              onChange={(event) => {
                setPhoneInput(event.target.value);
              }}
              placeholder="e.g. 0244123456"
            />
          </label>
          <button type="submit" className={calmPrimaryButtonInlineClass} disabled={lookupMutation.isPending}>
            {lookupMutation.isPending ? "Looking up…" : "Look up"}
          </button>
        </form>
        {lookupError !== null ? <p className="mt-3 text-sm text-destructive">{lookupError}</p> : null}

        {showMatchPicker ? (
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
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[match.contactPhone, match.district, match.locationArea]
                      .filter((part): part is string => part != null && part.length > 0)
                      .join(" · ")}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <form className="flex flex-col gap-6" onSubmit={handleSubmitVisit}>
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-sm font-medium">Vendor</p>
              <Select
                key={outletIdFromUrl || SELECT_NONE}
                value={resolvedOutletId || SELECT_NONE}
                onValueChange={(value) => {
                  const next = value === SELECT_NONE ? "" : value;
                  setPickedOutletId(next);
                  if (next.length > 0) {
                    loadByIdMutation.mutate(next);
                  } else {
                    setLookup(null);
                    setIssuedItemIds([]);
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select vendor">{selectedVendorLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Select vendor</SelectItem>
                  {resolvedOutletId && selectedOutlet === null && lookup === null ? (
                    <SelectItem value={resolvedOutletId}>Selected vendor</SelectItem>
                  ) : null}
                  {vendorOptions.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {vendorLabel(outlet)}
                      {outlet.locationArea ? ` · ${outlet.locationArea}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                New vendor?{" "}
                <Link href="/dashboard/outlet-visits/new" className={calmMutedLinkClass}>
                  Add vendor
                </Link>
              </p>
            </div>
            {(selectedOutlet?.latitude != null && selectedOutlet.longitude != null) ||
            lookup?.outlet ? (
              selectedOutlet?.latitude != null && selectedOutlet.longitude != null ? (
                <OutletMapPreview
                  latitude={selectedOutlet.latitude}
                  longitude={selectedOutlet.longitude}
                  locationArea={selectedOutlet.locationArea}
                />
              ) : null
            ) : null}
          </div>

          <ItemsGivenFields
            items={catalogItems.map((item) => ({ id: item.id, name: item.name }))}
            selectedIds={issuedItemIds}
            lockedIds={lookup?.items.filter((item) => item.given).map((item) => item.id) ?? []}
            onToggle={(itemId, given) => {
              setIssuedItemIds((prev) =>
                given ? [...prev, itemId] : prev.filter((id) => id !== itemId)
              );
            }}
          />

          <button
            type="submit"
            className={`${calmPrimaryButtonClass} lg:w-auto lg:min-w-56`}
            disabled={
              createVisitMutation.isPending || isCapturingVisitLocation || resolvedOutletId.length === 0
            }
          >
            {isCapturingVisitLocation
              ? "Getting GPS…"
              : createVisitMutation.isPending
                ? "Saving…"
                : "Save items visit"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default function RecordVendorVisitPage(): ReactElement {
  return (
    <Suspense fallback={<BoneyardInlineFallback name="field-record-visit-suspense" className="min-h-32" />}>
      <RecordItemsVisitPageInner />
    </Suspense>
  );
}
