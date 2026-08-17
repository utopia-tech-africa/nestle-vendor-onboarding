"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactElement, type SyntheticEvent, useState } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { CatalogSelect } from "@/components/catalog-fields";
import { OutletLocationEditor } from "@/components/outlet-location-editor";
import { outletMapsUrl } from "@/components/outlet-map-preview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAdminRegionListRegions } from "@/lib/api/generated/client";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmPrimaryButtonClass, calmSecondaryButtonClass } from "@/lib/calm-ui";
import { parseRegionsFromOrval } from "@/lib/ops/ops-adapters";
import { FALLBACK_FIELD_CATALOGS, catalogLabel, type FieldCatalogs } from "@/lib/outlet/field-catalogs";
import {
  createOutlet,
  getFieldCatalogs,
  listOutlets,
  updateOutlet,
  type CreateOutletPayload,
  type OutletRecord
} from "@/lib/outlet/outlet-api";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";
const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const SELECT_NONE = "__none__";
const outletQueryKey = ["ops", "outlets"] as const;

type OutletFormState = {
  name: string;
  category: string;
  distributorName: string;
  locationArea: string;
  district: string;
  regionId: string;
  yearsInBusiness: string;
  latitude: string;
  longitude: string;
  contactName: string;
  contactPhone: string;
  contactPhoneSecondary: string;
  contactEmail: string;
  vendorRole: string;
  gender: string;
  ageBracket: string;
  employeeCountBracket: string;
  averageDailySalesBracket: string;
  landmark: string;
  isActive: boolean;
};

const blankForm: OutletFormState = {
  name: "",
  category: "Koko seller",
  distributorName: "N/A",
  locationArea: "",
  district: "",
  regionId: "",
  yearsInBusiness: "",
  latitude: "",
  longitude: "",
  contactName: "",
  contactPhone: "",
  contactPhoneSecondary: "",
  contactEmail: "",
  vendorRole: "owner",
  gender: "",
  ageBracket: "",
  employeeCountBracket: "",
  averageDailySalesBracket: "",
  landmark: "",
  isActive: true
};

const parseCoords = (
  latitude: string,
  longitude: string
): { latitude: number; longitude: number } | null => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { latitude: lat, longitude: lng };
};

const toPayload = (state: OutletFormState): CreateOutletPayload => {
  const coords = parseCoords(state.latitude, state.longitude);
  const locationArea = state.locationArea.trim();
  const district = state.district.trim();
  const yearsRaw = state.yearsInBusiness.trim();
  const yearsParsed = yearsRaw.length > 0 ? Number(yearsRaw) : NaN;
  return {
    name: state.name.trim(),
    category: state.category.trim(),
    distributorName: state.distributorName.trim() || "N/A",
    contactName: state.contactName.trim(),
    contactPhone: state.contactPhone.trim(),
    ...(state.contactPhoneSecondary.trim()
      ? { contactPhoneSecondary: state.contactPhoneSecondary.trim() }
      : {}),
    ...(state.vendorRole ? { vendorRole: state.vendorRole } : {}),
    ...(state.gender ? { gender: state.gender } : {}),
    ...(state.ageBracket ? { ageBracket: state.ageBracket } : {}),
    ...(state.employeeCountBracket ? { employeeCountBracket: state.employeeCountBracket } : {}),
    ...(state.averageDailySalesBracket
      ? { averageDailySalesBracket: state.averageDailySalesBracket }
      : {}),
    ...(state.landmark.trim() ? { landmark: state.landmark.trim() } : {}),
    ...(coords !== null ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
    ...(locationArea.length >= 2 ? { locationArea } : {}),
    ...(district.length > 0 ? { district } : {}),
    ...(state.regionId.length > 0 ? { regionId: state.regionId } : {}),
    ...(Number.isFinite(yearsParsed) ? { yearsInBusiness: Math.trunc(yearsParsed) } : {}),
    ...(state.contactEmail.trim().length > 0 ? { contactEmail: state.contactEmail.trim() } : {}),
    isActive: state.isActive
  };
};

const validateOutletForm = (state: OutletFormState): string | null => {
  if (state.name.trim().length < 2 || state.category.trim().length < 2) {
    return "Business name and vendor type are required.";
  }
  if (state.contactName.trim().length < 2 || state.contactPhone.trim().length < 7) {
    return "Vendor name and phone are required.";
  }
  const coords = parseCoords(state.latitude, state.longitude);
  if (coords === null) {
    return "Set the vendor location on the map (search, My location, or click the map).";
  }
  const yearsRaw = state.yearsInBusiness.trim();
  if (yearsRaw.length > 0) {
    const years = Number(yearsRaw);
    if (!Number.isFinite(years) || years < 0 || years > 100) {
      return "Years in business must be between 0 and 100.";
    }
  }
  return null;
};

const outletToForm = (outlet: OutletRecord): OutletFormState => ({
  name: outlet.name,
  category: outlet.category,
  distributorName: outlet.distributorName,
  locationArea: outlet.locationArea,
  district: outlet.district ?? "",
  regionId: outlet.regionId ?? "",
  yearsInBusiness: outlet.yearsInBusiness !== null ? String(outlet.yearsInBusiness) : "",
  latitude: outlet.latitude !== null ? String(outlet.latitude) : "",
  longitude: outlet.longitude !== null ? String(outlet.longitude) : "",
  contactName: outlet.contactName ?? "",
  contactPhone: outlet.contactPhone ?? "",
  contactPhoneSecondary: outlet.contactPhoneSecondary ?? "",
  contactEmail: outlet.contactEmail ?? "",
  vendorRole: outlet.vendorRole ?? "owner",
  gender: outlet.gender ?? "",
  ageBracket: outlet.ageBracket ?? "",
  employeeCountBracket: outlet.employeeCountBracket ?? "",
  averageDailySalesBracket: outlet.averageDailySalesBracket ?? "",
  landmark: outlet.landmark ?? "",
  isActive: outlet.isActive
});

type RegionOption = { id: string; name: string };

type VendorFieldsProps = {
  form: OutletFormState;
  setForm: (updater: (prev: OutletFormState) => OutletFormState) => void;
  regions: RegionOption[];
  catalogs: FieldCatalogs;
  fieldIdPrefix: string;
};

const VendorFields = ({
  form,
  setForm,
  regions,
  catalogs,
  fieldIdPrefix
}: VendorFieldsProps): ReactElement => (
  <>
    <label className="text-xs font-medium text-muted-foreground">
      Business name
      <input
        className={inputClass}
        value={form.name}
        onChange={(event) => {
          setForm((prev) => ({ ...prev, name: event.target.value }));
        }}
        required
      />
    </label>
    <label className="text-xs font-medium text-muted-foreground">
      Vendor type
      <CatalogSelect
        value={form.category}
        options={catalogs.vendorTypes}
        onValueChange={(value) => {
          setForm((prev) => ({ ...prev, category: value }));
        }}
      />
    </label>
    <label className="text-xs font-medium text-muted-foreground">
      Role
      <CatalogSelect
        value={form.vendorRole}
        options={catalogs.vendorRoles}
        onValueChange={(value) => {
          setForm((prev) => ({ ...prev, vendorRole: value }));
        }}
      />
    </label>
    <label className="text-xs font-medium text-muted-foreground">
      Vendor name
      <input
        className={inputClass}
        value={form.contactName}
        onChange={(event) => {
          setForm((prev) => ({ ...prev, contactName: event.target.value }));
        }}
        required
      />
    </label>
    <label className="text-xs font-medium text-muted-foreground">
      Primary phone
      <input
        className={inputClass}
        value={form.contactPhone}
        onChange={(event) => {
          setForm((prev) => ({ ...prev, contactPhone: event.target.value }));
        }}
        required
      />
    </label>
    <label className="text-xs font-medium text-muted-foreground">
      Secondary phone
      <input
        className={inputClass}
        value={form.contactPhoneSecondary}
        onChange={(event) => {
          setForm((prev) => ({ ...prev, contactPhoneSecondary: event.target.value }));
        }}
      />
    </label>
    <label className="text-xs font-medium text-muted-foreground">
      Gender
      <CatalogSelect
        value={form.gender}
        options={catalogs.genders}
        onValueChange={(value) => {
          setForm((prev) => ({ ...prev, gender: value }));
        }}
        allowEmpty
        emptyLabel="Select gender"
      />
    </label>
    <label className="text-xs font-medium text-muted-foreground">
      Age
      <CatalogSelect
        value={form.ageBracket}
        options={catalogs.ageBrackets}
        onValueChange={(value) => {
          setForm((prev) => ({ ...prev, ageBracket: value }));
        }}
        allowEmpty
        emptyLabel="Select age"
      />
    </label>
    <label className="text-xs font-medium text-muted-foreground">
      Employees
      <CatalogSelect
        value={form.employeeCountBracket}
        options={catalogs.employeeCountBrackets}
        onValueChange={(value) => {
          setForm((prev) => ({ ...prev, employeeCountBracket: value }));
        }}
        allowEmpty
        emptyLabel="Select"
      />
    </label>
    <label className="text-xs font-medium text-muted-foreground">
      Average sales / day (GHS)
      <CatalogSelect
        value={form.averageDailySalesBracket}
        options={catalogs.averageDailySalesBrackets}
        onValueChange={(value) => {
          setForm((prev) => ({ ...prev, averageDailySalesBracket: value }));
        }}
        allowEmpty
        emptyLabel="Select"
      />
    </label>
    <label className="text-xs font-medium text-muted-foreground">
      District
      <input
        className={inputClass}
        value={form.district}
        onChange={(event) => {
          setForm((prev) => ({ ...prev, district: event.target.value }));
        }}
        placeholder="e.g. Ablekuma"
      />
    </label>
    <label className="text-xs font-medium text-muted-foreground">
      Community
      <input
        className={inputClass}
        value={form.locationArea}
        onChange={(event) => {
          setForm((prev) => ({ ...prev, locationArea: event.target.value }));
        }}
        placeholder="e.g. Darkuman"
      />
    </label>
    <label className="text-xs font-medium text-muted-foreground">
      Landmark
      <input
        className={inputClass}
        value={form.landmark}
        onChange={(event) => {
          setForm((prev) => ({ ...prev, landmark: event.target.value }));
        }}
        placeholder="Optional nearby landmark"
      />
    </label>
    <label className="text-xs font-medium text-muted-foreground">
      Region
      <Select
        value={form.regionId.length > 0 ? form.regionId : SELECT_NONE}
        onValueChange={(value) => {
          setForm((prev) => ({ ...prev, regionId: value === SELECT_NONE ? "" : value }));
        }}
      >
        <SelectTrigger className="mt-1 h-10 w-full">
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SELECT_NONE}>Unassigned</SelectItem>
          {regions.map((region) => (
            <SelectItem key={region.id} value={region.id}>
              {region.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
    <label className="text-xs font-medium text-muted-foreground">
      Years in business
      <input
        className={inputClass}
        type="number"
        min={0}
        max={100}
        value={form.yearsInBusiness}
        onChange={(event) => {
          setForm((prev) => ({ ...prev, yearsInBusiness: event.target.value }));
        }}
      />
    </label>
    <OutletLocationEditor
      fieldIdPrefix={fieldIdPrefix}
      latitude={form.latitude}
      longitude={form.longitude}
      onLatitudeChange={(value) => {
        setForm((prev) => ({ ...prev, latitude: value }));
      }}
      onLongitudeChange={(value) => {
        setForm((prev) => ({ ...prev, longitude: value }));
      }}
      onSuggestLocationArea={(shortLabel) => {
        setForm((prev) =>
          prev.locationArea.trim().length >= 2 ? prev : { ...prev, locationArea: shortLabel }
        );
      }}
    />
    <label className="text-xs font-medium text-muted-foreground">
      Distributor (optional)
      <input
        className={inputClass}
        value={form.distributorName}
        onChange={(event) => {
          setForm((prev) => ({ ...prev, distributorName: event.target.value }));
        }}
      />
    </label>
    <label className="text-xs font-medium text-muted-foreground">
      Email (optional)
      <input
        className={inputClass}
        type="email"
        value={form.contactEmail}
        onChange={(event) => {
          setForm((prev) => ({ ...prev, contactEmail: event.target.value }));
        }}
      />
    </label>
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground md:col-span-2">
      <input
        type="checkbox"
        checked={form.isActive}
        onChange={(event) => {
          setForm((prev) => ({ ...prev, isActive: event.target.checked }));
        }}
      />
      Active vendor
    </label>
  </>
);

export default function OpsOutletsPage(): ReactElement {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [createForm, setCreateForm] = useState<OutletFormState>(blankForm);
  const [editingOutlet, setEditingOutlet] = useState<OutletRecord | null>(null);
  const [editForm, setEditForm] = useState<OutletFormState>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);

  const regionsQuery = useAdminRegionListRegions({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseRegionsFromOrval(r).filter((row) => row.isActive)
    }
  });
  const regions = regionsQuery.data ?? [];

  const catalogsQuery = useQuery({
    queryKey: ["ops", "catalogs"],
    queryFn: async () => getFieldCatalogs(accessToken ?? ""),
    enabled: accessToken !== null,
    staleTime: 60 * 60 * 1000,
    placeholderData: FALLBACK_FIELD_CATALOGS
  });
  const catalogs = catalogsQuery.data ?? FALLBACK_FIELD_CATALOGS;

  const outletsQuery = useQuery({
    queryKey: outletQueryKey,
    queryFn: async () => listOutlets(accessToken ?? ""),
    enabled: accessToken !== null
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateOutletPayload) => createOutlet(accessToken ?? "", payload),
    onSuccess: async () => {
      setCreateForm(blankForm);
      await queryClient.invalidateQueries({ queryKey: outletQueryKey });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateOutletPayload }) =>
      updateOutlet(accessToken ?? "", id, payload),
    onSuccess: async () => {
      setEditingOutlet(null);
      await queryClient.invalidateQueries({ queryKey: outletQueryKey });
    }
  });

  const handleCreate = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setFormError(null);
    const validationError = validateOutletForm(createForm);
    if (validationError !== null) {
      setFormError(validationError);
      return;
    }
    createMutation.mutate(toPayload(createForm), {
      onError: (error: unknown) => {
        const message =
          error instanceof ApiError
            ? (error.problem?.detail ?? error.message)
            : "Could not create vendor.";
        setFormError(message);
      }
    });
  };

  const startEdit = (outlet: OutletRecord): void => {
    setFormError(null);
    setEditingOutlet(outlet);
    setEditForm(outletToForm(outlet));
  };

  const handleEditSave = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (editingOutlet === null) return;
    setFormError(null);
    const validationError = validateOutletForm(editForm);
    if (validationError !== null) {
      setFormError(validationError);
      return;
    }
    updateMutation.mutate(
      { id: editingOutlet.id, payload: toPayload(editForm) },
      {
        onError: (error: unknown) => {
          const message =
            error instanceof ApiError
              ? (error.problem?.detail ?? error.message)
              : "Could not update vendor.";
          setFormError(message);
        }
      }
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Vendors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Master list of koko vendors. Each vendor gets a region-based ID such as{" "}
          <code className="text-xs">GA-001</code>. Set each shop&apos;s map pin so promoters visit
          the same location.
        </p>
        <p className="mt-1 text-sm">
          <Link
            href="/ops/outlets/visits"
            className="text-primary underline-offset-4 hover:underline"
          >
            Open vendor visit reports
          </Link>
        </p>
      </div>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Create vendor</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
          <VendorFields
            form={createForm}
            setForm={setCreateForm}
            regions={regions}
            catalogs={catalogs}
            fieldIdPrefix="create-vendor"
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              className={calmPrimaryButtonClass}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create vendor"}
            </button>
          </div>
        </form>
      </section>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Vendor database</h2>
        {outletsQuery.isLoading ? (
          <BoneyardInlineFallback name="ops-outlets-list" className="mt-3 min-h-[12rem]" />
        ) : null}
        {outletsQuery.isError ? (
          <p className="mt-3 text-sm text-destructive">Could not load vendors.</p>
        ) : null}
        {outletsQuery.data?.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No vendors yet.</p>
        ) : null}
        {outletsQuery.data !== undefined && outletsQuery.data.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {outletsQuery.data.map((outlet) => (
              <li
                key={outlet.id}
                className="rounded-lg border border-border bg-muted/20 p-4 dark:bg-muted/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{outlet.name}</p>
                    {outlet.vendorCode ? (
                      <p className="font-mono text-xs text-foreground">{outlet.vendorCode}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {outlet.category}
                      {outlet.contactName ? ` · ${outlet.contactName}` : ""}
                      {catalogLabel(catalogs.vendorRoles, outlet.vendorRole)
                        ? ` · ${catalogLabel(catalogs.vendorRoles, outlet.vendorRole)}`
                        : ""}
                      {outlet.contactPhone ? ` · ${outlet.contactPhone}` : ""}
                      {outlet.contactPhoneSecondary ? ` · ${outlet.contactPhoneSecondary}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[
                        outlet.district,
                        outlet.locationArea,
                        outlet.landmark,
                        outlet.region?.name,
                        catalogLabel(catalogs.ageBrackets, outlet.ageBracket),
                        outlet.yearsInBusiness != null
                          ? `${String(outlet.yearsInBusiness)} yrs`
                          : null
                      ]
                        .filter((part) => part != null && String(part).trim().length > 0)
                        .join(" · ") || "No location details"}
                    </p>
                    {outlet.latitude !== null && outlet.longitude !== null ? (
                      <p className="mt-1 text-xs">
                        <a
                          href={outletMapsUrl(outlet.latitude, outlet.longitude)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {outlet.latitude.toFixed(5)}, {outlet.longitude.toFixed(5)} — Maps
                        </a>
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                        No map pin yet — edit to set location
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        outlet.isActive
                          ? "rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"
                          : "rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      }
                    >
                      {outlet.isActive ? "Active" : "Inactive"}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => {
                        startEdit(outlet);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {editingOutlet !== null ? (
        <div className="fixed inset-0 z-100 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Edit vendor</h2>
            {editingOutlet.vendorCode ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Vendor ID:{" "}
                <code className="text-foreground">{editingOutlet.vendorCode}</code> (assigned at
                create)
              </p>
            ) : null}
            <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleEditSave}>
              <VendorFields
                form={editForm}
                setForm={setEditForm}
                regions={regions}
                catalogs={catalogs}
                fieldIdPrefix="edit-vendor"
              />
              <div className="flex flex-col-reverse gap-2 md:col-span-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className={calmSecondaryButtonClass}
                  onClick={() => {
                    setEditingOutlet(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={calmPrimaryButtonClass}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {formError !== null ? (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}
    </div>
  );
}
