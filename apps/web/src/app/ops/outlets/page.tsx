"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useMemo,
  useState
} from "react";

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
import { VendorAvatar, VendorPhotoGallery } from "@/components/vendor-photos";
import { useAdminRegionListRegions } from "@/lib/api/generated/client";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  calmPrimaryButtonClass,
  calmPrimaryButtonInlineClass,
  calmSecondaryButtonClass
} from "@/lib/calm-ui";
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
import { toast } from "@/lib/toast";

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

const DetailRow = ({
  label,
  value
}: {
  label: string;
  value: string | number | null | undefined;
}): ReactElement | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text.length === 0) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{text}</dd>
    </div>
  );
};

const VendorModal = ({
  title,
  subtitle,
  portrait,
  onClose,
  children
}: {
  title: string;
  subtitle?: ReactNode;
  portrait?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}): ReactElement => (
  <div
    className="fixed inset-0 z-100 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center"
    onClick={onClose}
  >
    <div
      className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
      onClick={(event) => {
        event.stopPropagation();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vendor-modal-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {portrait}
          <div className="min-w-0">
            <h2 id="vendor-modal-title" className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {subtitle}
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      {children}
    </div>
  </div>
);

const statusBadgeClass = (isActive: boolean): string =>
  isActive
    ? "rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"
    : "rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground";

export default function OpsOutletsPage(): ReactElement {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [createForm, setCreateForm] = useState<OutletFormState>(blankForm);
  const [editingOutlet, setEditingOutlet] = useState<OutletRecord | null>(null);
  const [editForm, setEditForm] = useState<OutletFormState>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState(SELECT_NONE);
  const [typeFilter, setTypeFilter] = useState(SELECT_NONE);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

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
  const outlets = outletsQuery.data ?? [];

  const selectedOutlet = useMemo(
    () => outlets.find((outlet) => outlet.id === selectedId) ?? null,
    [outlets, selectedId]
  );

  const filteredOutlets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return outlets.filter((outlet) => {
      if (regionFilter !== SELECT_NONE && outlet.regionId !== regionFilter) return false;
      if (typeFilter !== SELECT_NONE && outlet.category !== typeFilter) return false;
      if (statusFilter === "active" && !outlet.isActive) return false;
      if (statusFilter === "inactive" && outlet.isActive) return false;
      if (query.length === 0) return true;
      const hay = [
        outlet.vendorCode,
        outlet.name,
        outlet.category,
        outlet.contactName,
        outlet.contactPhone,
        outlet.contactPhoneSecondary,
        outlet.contactEmail,
        outlet.district,
        outlet.locationArea,
        outlet.landmark,
        outlet.region?.name
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [outlets, regionFilter, search, statusFilter, typeFilter]);

  const createMutation = useMutation({
    mutationFn: async (payload: CreateOutletPayload) => createOutlet(accessToken ?? "", payload),
    onSuccess: async (created) => {
      setCreateForm(blankForm);
      setCreating(false);
      setFormError(null);
      toast.success(
        created.vendorCode
          ? `Vendor created as ${created.vendorCode}.`
          : "Vendor created."
      );
      await queryClient.invalidateQueries({ queryKey: outletQueryKey });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateOutletPayload }) =>
      updateOutlet(accessToken ?? "", id, payload),
    onSuccess: async () => {
      setEditingOutlet(null);
      setFormError(null);
      toast.success("Vendor updated.");
      await queryClient.invalidateQueries({ queryKey: outletQueryKey });
    }
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      if (editingOutlet !== null) {
        setEditingOutlet(null);
        setFormError(null);
        return;
      }
      if (creating) {
        setCreating(false);
        setFormError(null);
        return;
      }
      if (selectedId !== null) setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [creating, editingOutlet, selectedId]);

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
    setSelectedId(outlet.id);
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

  const openCreate = (): void => {
    setFormError(null);
    setCreateForm(blankForm);
    setEditingOutlet(null);
    setCreating(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Vendors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Master list of koko vendors. Each vendor gets a region-based ID such as{" "}
            <code className="text-xs">GA-001</code>. Click a row for details.
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
        <button type="button" className={calmPrimaryButtonInlineClass} onClick={openCreate}>
          Add vendor
        </button>
      </div>

      <section className={cardClass}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-muted-foreground sm:col-span-2">
            Search
            <input
              className={inputClass}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              placeholder="Vendor ID, name, phone, district…"
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Region
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>All regions</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Type
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>All types</SelectItem>
                {catalogs.vendorTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Status
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as "all" | "active" | "inactive");
              }}
            >
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Vendor database</h2>
          {outletsQuery.data !== undefined ? (
            <p className="text-xs text-muted-foreground">
              {filteredOutlets.length}
              {search.trim() || regionFilter !== SELECT_NONE || typeFilter !== SELECT_NONE || statusFilter !== "all"
                ? ` of ${outlets.length}`
                : ""}{" "}
              vendor{filteredOutlets.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
        {outletsQuery.isLoading ? (
          <BoneyardInlineFallback name="ops-outlets-list" className="mt-3 min-h-48" />
        ) : null}
        {outletsQuery.isError ? (
          <p className="mt-3 text-sm text-destructive">Could not load vendors.</p>
        ) : null}
        {outletsQuery.data?.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No vendors yet. Click Add vendor to create one.</p>
        ) : null}
        {outletsQuery.data !== undefined &&
        outletsQuery.data.length > 0 &&
        filteredOutlets.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No vendors match those filters.</p>
        ) : null}
        {filteredOutlets.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-max border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Vendor ID</th>
                  <th className="py-2 pr-3 font-medium">Business</th>
                  <th className="py-2 pr-3 font-medium">Contact</th>
                  <th className="py-2 pr-3 font-medium">Phone</th>
                  <th className="py-2 pr-3 font-medium">Region</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOutlets.map((outlet) => {
                  const isSelected = selectedId === outlet.id;
                  return (
                    <tr
                      key={outlet.id}
                      className={`cursor-pointer border-b border-border/80 last:border-0 hover:bg-muted/40 ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                      onClick={() => {
                        setSelectedId(outlet.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedId(outlet.id);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td className="py-3 pr-3 font-mono text-xs text-foreground">
                        {outlet.vendorCode ?? "—"}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <VendorAvatar outlet={outlet} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{outlet.name}</p>
                            <p className="text-xs text-muted-foreground">{outlet.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{outlet.contactName ?? "—"}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{outlet.contactPhone ?? "—"}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{outlet.region?.name ?? "—"}</td>
                      <td className="py-3">
                        <span className={statusBadgeClass(outlet.isActive)}>
                          {outlet.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {creating ? (
        <VendorModal title="Add vendor" onClose={() => { setCreating(false); setFormError(null); }}>
          <p className="mt-1 text-xs text-muted-foreground">
            The vendor ID is assigned from the region when you save, for example{" "}
            <code>GA-001</code>.
          </p>
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
            <VendorFields
              form={createForm}
              setForm={setCreateForm}
              regions={regions}
              catalogs={catalogs}
              fieldIdPrefix="create-vendor"
            />
            {formError !== null ? (
              <p className="text-sm text-destructive md:col-span-2" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 md:col-span-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={calmSecondaryButtonClass}
                onClick={() => {
                  setCreating(false);
                  setFormError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={calmPrimaryButtonClass}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create vendor"}
              </button>
            </div>
          </form>
        </VendorModal>
      ) : null}

      {selectedOutlet !== null && editingOutlet === null ? (
        <VendorModal
          title={selectedOutlet.name}
          portrait={<VendorAvatar outlet={selectedOutlet} size="lg" />}
          subtitle={
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {selectedOutlet.vendorCode ?? "No vendor ID yet"}
            </p>
          }
          onClose={() => {
            setSelectedId(null);
          }}
        >
          <VendorPhotoGallery outlet={selectedOutlet} className="mt-5" />
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailRow label="Vendor ID" value={selectedOutlet.vendorCode} />
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <span className={statusBadgeClass(selectedOutlet.isActive)}>
                  {selectedOutlet.isActive ? "Active" : "Inactive"}
                </span>
              </dd>
            </div>
            <DetailRow label="Vendor type" value={selectedOutlet.category} />
            <DetailRow
              label="Role"
              value={catalogLabel(catalogs.vendorRoles, selectedOutlet.vendorRole)}
            />
            <DetailRow label="Contact" value={selectedOutlet.contactName} />
            <DetailRow label="Primary phone" value={selectedOutlet.contactPhone} />
            <DetailRow label="Secondary phone" value={selectedOutlet.contactPhoneSecondary} />
            <DetailRow label="Email" value={selectedOutlet.contactEmail} />
            <DetailRow label="Gender" value={catalogLabel(catalogs.genders, selectedOutlet.gender)} />
            <DetailRow label="Age" value={catalogLabel(catalogs.ageBrackets, selectedOutlet.ageBracket)} />
            <DetailRow
              label="Employees"
              value={catalogLabel(catalogs.employeeCountBrackets, selectedOutlet.employeeCountBracket)}
            />
            <DetailRow
              label="Average sales / day"
              value={catalogLabel(
                catalogs.averageDailySalesBrackets,
                selectedOutlet.averageDailySalesBracket
              )}
            />
            <DetailRow label="Region" value={selectedOutlet.region?.name} />
            <DetailRow label="District" value={selectedOutlet.district} />
            <DetailRow label="Community" value={selectedOutlet.locationArea} />
            <DetailRow label="Landmark" value={selectedOutlet.landmark} />
            <DetailRow
              label="Years in business"
              value={
                selectedOutlet.yearsInBusiness != null
                  ? String(selectedOutlet.yearsInBusiness)
                  : null
              }
            />
            <DetailRow
              label="Distributor"
              value={
                selectedOutlet.distributorName !== "N/A" ? selectedOutlet.distributorName : null
              }
            />
            {selectedOutlet.latitude !== null && selectedOutlet.longitude !== null ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-muted-foreground">Map pin</dt>
                <dd className="mt-0.5 text-sm">
                  <a
                    href={outletMapsUrl(selectedOutlet.latitude, selectedOutlet.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {selectedOutlet.latitude.toFixed(5)}, {selectedOutlet.longitude.toFixed(5)} — Maps
                  </a>
                </dd>
              </div>
            ) : (
              <p className="text-sm text-amber-700 sm:col-span-2 dark:text-amber-400">
                No map pin yet — edit to set location.
              </p>
            )}
          </dl>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link
              href={`/ops/outlets/visits?outletId=${encodeURIComponent(selectedOutlet.id)}`}
              className={calmSecondaryButtonClass}
            >
              View visits
            </Link>
            <button
              type="button"
              className={calmPrimaryButtonClass}
              onClick={() => {
                startEdit(selectedOutlet);
              }}
            >
              Edit vendor
            </button>
          </div>
        </VendorModal>
      ) : null}

      {editingOutlet !== null ? (
        <VendorModal
          title="Edit vendor"
          subtitle={
            editingOutlet.vendorCode ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Vendor ID: <code className="text-foreground">{editingOutlet.vendorCode}</code>{" "}
                (assigned at create)
              </p>
            ) : null
          }
          onClose={() => {
            setEditingOutlet(null);
            setFormError(null);
          }}
        >
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleEditSave}>
            <VendorFields
              form={editForm}
              setForm={setEditForm}
              regions={regions}
              catalogs={catalogs}
              fieldIdPrefix="edit-vendor"
            />
            {formError !== null ? (
              <p className="text-sm text-destructive md:col-span-2" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 md:col-span-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={calmSecondaryButtonClass}
                onClick={() => {
                  setEditingOutlet(null);
                  setFormError(null);
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
        </VendorModal>
      ) : null}
    </div>
  );
}
