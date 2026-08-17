"use client";

import { type QueryClient } from "@tanstack/react-query";

import { meUpdateMeLocation } from "@/lib/api/generated/client";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  createFieldOutlet,
  createOutletVisit,
  reportSyncFailure
} from "@/lib/outlet/outlet-api";
import { toast } from "@/lib/toast";

import {
  deleteFieldOutboxEntry,
  listFieldOutboxEntries,
  parsePendingOutletId
} from "./field-offline-idb";

const invalidateAfterFieldSync = async (queryClient: QueryClient | undefined): Promise<void> => {
  if (queryClient === undefined) {
    return;
  }
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      if (!Array.isArray(key) || typeof key[0] !== "string") {
        return false;
      }
      if (key[0].startsWith("/me/")) {
        return true;
      }
      if (key[0] === "field") {
        return true;
      }
      return false;
    }
  });
};

/**
 * Sends queued field writes (clock-in / vendor create / visit) in order.
 * Resolves pending:<localId> outlet refs after offline vendor creates sync.
 */
export const flushFieldOutbox = async (queryClient: QueryClient | undefined): Promise<void> => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  const entries = await listFieldOutboxEntries();
  if (entries.length === 0) {
    return;
  }

  const token = useAuthStore.getState().accessToken;
  if (token === null) {
    return;
  }

  let flushed = 0;
  let failedClientErrors = 0;
  const localIdToServerId = new Map<string, string>();

  for (const entry of entries) {
    try {
      if (entry.kind === "location_ping") {
        await meUpdateMeLocation(entry.payload);
      } else if (entry.kind === "vendor_create") {
        const created = await createFieldOutlet(token, entry.payload);
        localIdToServerId.set(entry.localId, created.id);
      } else {
        const pendingLocalId = parsePendingOutletId(entry.payload.outletId);
        const resolvedOutletId =
          pendingLocalId !== null
            ? localIdToServerId.get(pendingLocalId)
            : entry.payload.outletId;
        if (pendingLocalId !== null && resolvedOutletId === undefined) {
          // Vendor create still pending ahead in queue or failed — stop to retry later.
          return;
        }
        await createOutletVisit(token, {
          ...entry.payload,
          outletId: resolvedOutletId ?? entry.payload.outletId
        });
      }
      await deleteFieldOutboxEntry(entry.id);
      flushed += 1;
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) {
        return;
      }
      if (error instanceof ApiError && error.status === 401) {
        return;
      }
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        await deleteFieldOutboxEntry(entry.id);
        failedClientErrors += 1;
        toast.error("Could not sync a saved field record", {
          description: error.message.slice(0, 220)
        });
        continue;
      }
      try {
        await reportSyncFailure(token, {
          message: error instanceof Error ? error.message : "Offline sync failed",
          pendingCount: entries.length - flushed
        });
      } catch {
        // ignore alert reporting failures
      }
      return;
    }
  }

  if (flushed > 0) {
    await invalidateAfterFieldSync(queryClient);
    toast.success(
      flushed === 1 ? "Saved field record synced" : `${String(flushed)} saved field records synced`
    );
  }

  if (failedClientErrors > 0) {
    try {
      await reportSyncFailure(token, {
        message: `${String(failedClientErrors)} offline item(s) dropped after client errors`,
        pendingCount: 0
      });
    } catch {
      // ignore
    }
  }
};
