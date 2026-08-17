"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  FIELD_OUTBOX_CHANGED_EVENT,
  listPendingLocalVendors,
  type PendingLocalVendor
} from "@/lib/field/field-offline-idb";
import { listFieldOutlets, type OutletRecord } from "@/lib/outlet/outlet-api";

import { fieldOutletsQueryKey, pendingVendorsToRecords } from "./field-vendor-shared";

export const useFieldVendorOptions = (
  accessToken: string | null
): {
  vendorOptions: OutletRecord[];
  isLoading: boolean;
  isError: boolean;
} => {
  const [pendingVendors, setPendingVendors] = useState<PendingLocalVendor[]>([]);

  useEffect(() => {
    const refreshPending = (): void => {
      void listPendingLocalVendors().then(setPendingVendors);
    };
    refreshPending();
    window.addEventListener(FIELD_OUTBOX_CHANGED_EVENT, refreshPending);
    return () => window.removeEventListener(FIELD_OUTBOX_CHANGED_EVENT, refreshPending);
  }, []);

  const outletsQuery = useQuery({
    queryKey: fieldOutletsQueryKey,
    queryFn: async () => listFieldOutlets(accessToken ?? ""),
    enabled: accessToken !== null,
    staleTime: 60 * 60 * 1000
  });

  const vendorOptions = useMemo(
    () => [...pendingVendorsToRecords(pendingVendors), ...(outletsQuery.data ?? [])],
    [outletsQuery.data, pendingVendors]
  );

  return {
    vendorOptions,
    isLoading: outletsQuery.isLoading,
    isError: outletsQuery.isError
  };
};
