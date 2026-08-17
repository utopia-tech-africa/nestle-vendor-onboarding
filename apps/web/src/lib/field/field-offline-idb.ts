"use client";

/**
 * Queued field writes (clock-in / vendor create / vendor visit) for offline sync.
 */
import type { CreateFieldOutletPayload, CreateOutletVisitPayload } from "@/lib/outlet/outlet-api";
import type { UpdateLocationDto } from "@/lib/api/generated/model/updateLocationDto";

const DB_NAME = "nestle-field-offline";
const STORE = "field-outbox";
const DB_VERSION = 1;

export const PENDING_OUTLET_PREFIX = "pending:";

export type FieldOutboxEntry =
  | { id: string; kind: "location_ping"; createdAt: number; payload: UpdateLocationDto }
  | { id: string; kind: "outlet_visit"; createdAt: number; payload: CreateOutletVisitPayload }
  | {
      id: string;
      kind: "vendor_create";
      createdAt: number;
      localId: string;
      payload: CreateFieldOutletPayload;
    };

export type PendingLocalVendor = {
  localId: string;
  name: string;
  category: string;
  contactName: string;
  contactPhone: string;
  contactPhoneSecondary?: string;
  vendorRole?: string;
  gender?: string;
  ageBracket?: string;
  employeeCountBracket?: string;
  averageDailySalesBracket?: string;
  landmark?: string;
  district?: string;
  locationArea?: string;
  regionId?: string;
  yearsInBusiness?: number;
  latitude: number;
  longitude: number;
  createdAt: number;
};

export const FIELD_OUTBOX_CHANGED_EVENT = "nestle-field-outbox-changed";

export const dispatchFieldOutboxChanged = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(FIELD_OUTBOX_CHANGED_EVENT));
};

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available on this device."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (): void => {
      reject(request.error ?? new Error("Could not open offline storage."));
    };
    request.onsuccess = (): void => {
      resolve(request.result);
    };
    request.onupgradeneeded = (): void => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });

export const addFieldOutboxEntry = async (entry: FieldOutboxEntry): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = (): void => {
      db.close();
      resolve();
    };
    tx.onerror = (): void => {
      reject(tx.error ?? new Error("Could not save to offline storage."));
    };
    const store = tx.objectStore(STORE);
    const put = store.add(entry);
    put.onerror = (): void => {
      reject(put.error ?? new Error("Could not save to offline storage."));
    };
  });
  dispatchFieldOutboxChanged();
};

export const deleteFieldOutboxEntry = async (id: string): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = (): void => {
      db.close();
      resolve();
    };
    tx.onerror = (): void => {
      reject(tx.error ?? new Error("Could not update offline storage."));
    };
    const store = tx.objectStore(STORE);
    const del = store.delete(id);
    del.onerror = (): void => {
      reject(del.error ?? new Error("Could not update offline storage."));
    };
  });
  dispatchFieldOutboxChanged();
};

export const clearFieldOutbox = async (): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = (): void => {
      db.close();
      resolve();
    };
    tx.onerror = (): void => {
      reject(tx.error ?? new Error("Could not clear offline storage."));
    };
    const store = tx.objectStore(STORE);
    const req = store.clear();
    req.onerror = (): void => {
      reject(req.error ?? new Error("Could not clear offline storage."));
    };
  });
  dispatchFieldOutboxChanged();
};

export const listFieldOutboxEntries = async (): Promise<FieldOutboxEntry[]> => {
  const db = await openDb();
  const rows = await new Promise<FieldOutboxEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = (): void => {
      resolve(req.result as FieldOutboxEntry[]);
    };
    req.onerror = (): void => {
      reject(req.error ?? new Error("Could not read offline storage."));
    };
    tx.oncomplete = (): void => {
      db.close();
    };
  });
  return [...rows].sort((a, b) => a.createdAt - b.createdAt);
};

export const countFieldOutboxEntries = async (): Promise<number> => {
  const rows = await listFieldOutboxEntries();
  return rows.length;
};

export const listPendingLocalVendors = async (): Promise<PendingLocalVendor[]> => {
  const entries = await listFieldOutboxEntries();
  return entries
    .filter((e): e is Extract<FieldOutboxEntry, { kind: "vendor_create" }> => e.kind === "vendor_create")
    .map((e) => ({
      localId: e.localId,
      name: e.payload.name,
      category: e.payload.category,
      contactName: e.payload.contactName,
      contactPhone: e.payload.contactPhone,
      ...(e.payload.contactPhoneSecondary
        ? { contactPhoneSecondary: e.payload.contactPhoneSecondary }
        : {}),
      ...(e.payload.vendorRole ? { vendorRole: e.payload.vendorRole } : {}),
      ...(e.payload.gender ? { gender: e.payload.gender } : {}),
      ...(e.payload.ageBracket ? { ageBracket: e.payload.ageBracket } : {}),
      ...(e.payload.employeeCountBracket
        ? { employeeCountBracket: e.payload.employeeCountBracket }
        : {}),
      ...(e.payload.averageDailySalesBracket
        ? { averageDailySalesBracket: e.payload.averageDailySalesBracket }
        : {}),
      ...(e.payload.landmark ? { landmark: e.payload.landmark } : {}),
      ...(e.payload.district ? { district: e.payload.district } : {}),
      ...(e.payload.locationArea ? { locationArea: e.payload.locationArea } : {}),
      ...(e.payload.regionId ? { regionId: e.payload.regionId } : {}),
      ...(e.payload.yearsInBusiness !== undefined
        ? { yearsInBusiness: e.payload.yearsInBusiness }
        : {}),
      latitude: e.payload.latitude,
      longitude: e.payload.longitude,
      createdAt: e.createdAt
    }));
};

export const toPendingOutletId = (localId: string): string => `${PENDING_OUTLET_PREFIX}${localId}`;

export const parsePendingOutletId = (outletId: string): string | null =>
  outletId.startsWith(PENDING_OUTLET_PREFIX) ? outletId.slice(PENDING_OUTLET_PREFIX.length) : null;
