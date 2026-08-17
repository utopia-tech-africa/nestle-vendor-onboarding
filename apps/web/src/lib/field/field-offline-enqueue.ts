"use client";

import type { UpdateLocationDto } from "@/lib/api/generated/model/updateLocationDto";
import type { CreateFieldOutletPayload, CreateOutletVisitPayload } from "@/lib/outlet/outlet-api";

import { addFieldOutboxEntry, toPendingOutletId } from "./field-offline-idb";

export const enqueueLocationPingForOfflineSync = async (
  payload: UpdateLocationDto
): Promise<void> => {
  await addFieldOutboxEntry({
    id: crypto.randomUUID(),
    kind: "location_ping",
    createdAt: Date.now(),
    payload
  });
};

export const enqueueOutletVisitForOfflineSync = async (
  payload: CreateOutletVisitPayload
): Promise<void> => {
  await addFieldOutboxEntry({
    id: crypto.randomUUID(),
    kind: "outlet_visit",
    createdAt: Date.now(),
    payload
  });
};

/** Returns pending outlet id (`pending:<localId>`) for use in offline visits before sync. */
export const enqueueVendorCreateForOfflineSync = async (
  payload: CreateFieldOutletPayload
): Promise<string> => {
  const localId = crypto.randomUUID();
  await addFieldOutboxEntry({
    id: crypto.randomUUID(),
    kind: "vendor_create",
    createdAt: Date.now(),
    localId,
    payload
  });
  return toPendingOutletId(localId);
};
