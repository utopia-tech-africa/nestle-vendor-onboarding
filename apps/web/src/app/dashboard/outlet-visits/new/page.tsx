"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactElement, type SyntheticEvent, useEffect, useState } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { CatalogSelect } from "@/components/catalog-fields";
import { PhotoCapture } from "@/components/photo-capture";
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
import { calmMutedLinkClass, calmPrimaryButtonClass } from "@/lib/calm-ui";
import { enqueueVendorCreateForOfflineSync } from "@/lib/field/field-offline-enqueue";
import { requestCurrentPosition } from "@/lib/geolocation/request-current-position";
import { FALLBACK_FIELD_CATALOGS } from "@/lib/outlet/field-catalogs";
import {
  createFieldOutlet,
  getFieldCatalogs,
  listFieldRegions,
  type CreateFieldOutletPayload,
  type OutletRecord,
  type VisitPhotoCategory
} from "@/lib/outlet/outlet-api";
import { toast } from "@/lib/toast";

import {
  blankVendorForm,
  fieldCatalogsQueryKey,
  fieldOutletsQueryKey,
  fieldRegionsQueryKey,
  fieldVendorInputClass,
  fieldVendorPageClass,
  fieldVendorVisitHref,
  optionalProfilePayload,
  PHOTO_CATEGORIES,
  SELECT_NONE,
  type NewVendorFormState
} from "../field-vendor-shared";

export default function RegisterVendorPage(): ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const userRegionId = useAuthStore((state) => state.user?.regionId ?? "");
  const online = useNetworkOnline();

  const [vendorForm, setVendorForm] = useState<NewVendorFormState>(() =>
    blankVendorForm(userRegionId ?? "")
  );
  const [photos, setPhotos] = useState<Partial<Record<VisitPhotoCategory, string[]>>>({});
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [isCapturingVendorLocation, setIsCapturingVendorLocation] = useState(false);

  useEffect(() => {
    if (userRegionId) {
      setVendorForm((prev) => (prev.regionId ? prev : { ...prev, regionId: userRegionId }));
    }
  }, [userRegionId]);

  const regionsQuery = useQuery({
    queryKey: fieldRegionsQueryKey,
    queryFn: async () => listFieldRegions(accessToken ?? ""),
    enabled: accessToken !== null,
    staleTime: 60 * 60 * 1000
  });

  const catalogsQuery = useQuery({
    queryKey: fieldCatalogsQueryKey,
    queryFn: async () => getFieldCatalogs(accessToken ?? ""),
    enabled: accessToken !== null,
    staleTime: 60 * 60 * 1000,
    placeholderData: FALLBACK_FIELD_CATALOGS
  });
  const catalogs = catalogsQuery.data ?? FALLBACK_FIELD_CATALOGS;

  const createVendorMutation = useMutation({
    mutationFn: async (payload: CreateFieldOutletPayload) =>
      createFieldOutlet(accessToken ?? "", payload)
  });

  const goToVisit = (outletId: string): void => {
    router.push(fieldVendorVisitHref(outletId));
  };

  const handleCreateVendor = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setVendorError(null);
    if (
      vendorForm.name.trim().length < 2 ||
      vendorForm.contactName.trim().length < 2 ||
      vendorForm.contactPhone.trim().length < 7
    ) {
      setVendorError("Business name, vendor name, and primary phone are required.");
      return;
    }
    setIsCapturingVendorLocation(true);
    void (async () => {
      const position = await requestCurrentPosition();
      setIsCapturingVendorLocation(false);
      if (!position.ok) {
        setVendorError(position.message);
        return;
      }
      const years = vendorForm.yearsInBusiness.trim()
        ? Number.parseInt(vendorForm.yearsInBusiness, 10)
        : undefined;
      const onboardingPhotos = PHOTO_CATEGORIES.flatMap((cat) =>
        (photos[cat.id] ?? []).map((photoBase64) => ({ category: cat.id, photoBase64 }))
      );
      const clearPhotos = (): void => {
        setPhotos({});
      };
      const payload: CreateFieldOutletPayload = {
        name: vendorForm.name.trim(),
        category: vendorForm.category.trim() || "Koko seller",
        contactName: vendorForm.contactName.trim(),
        contactPhone: vendorForm.contactPhone.trim(),
        latitude: position.latitude,
        longitude: position.longitude,
        ...optionalProfilePayload(vendorForm),
        ...(vendorForm.district.trim() ? { district: vendorForm.district.trim() } : {}),
        ...(vendorForm.locationArea.trim()
          ? { locationArea: vendorForm.locationArea.trim() }
          : {}),
        ...(vendorForm.regionId ? { regionId: vendorForm.regionId } : {}),
        ...(years !== undefined && Number.isFinite(years) ? { yearsInBusiness: years } : {}),
        ...(onboardingPhotos.length > 0 ? { photos: onboardingPhotos } : {})
      };

      if (!online) {
        try {
          const pendingId = await enqueueVendorCreateForOfflineSync(payload);
          toast.success("Vendor saved offline. Record the visit next — it will sync later.");
          setVendorForm(blankVendorForm(userRegionId ?? ""));
          clearPhotos();
          goToVisit(pendingId);
        } catch {
          setVendorError("Could not save vendor offline.");
        }
        return;
      }

      createVendorMutation.mutate(payload, {
        onSuccess: (created) => {
          toast.success(
            created.vendorCode
              ? `Vendor onboarded as ${created.vendorCode}. Record the visit next.`
              : "Vendor onboarded. Record the visit next."
          );
          setVendorForm(blankVendorForm(userRegionId ?? ""));
          clearPhotos();
          queryClient.setQueryData(fieldOutletsQueryKey, (previous: OutletRecord[] | undefined) => {
            if (previous === undefined) return [created];
            if (previous.some((row) => row.id === created.id)) return previous;
            return [created, ...previous];
          });
          goToVisit(created.id);
        },
        onError: (error: unknown) => {
          if (error instanceof ApiError && error.status === 0) {
            void enqueueVendorCreateForOfflineSync(payload).then((pendingId) => {
              toast.success("Vendor saved offline. Record the visit next.");
              setVendorForm(blankVendorForm(userRegionId ?? ""));
              clearPhotos();
              goToVisit(pendingId);
            });
            return;
          }
          setVendorError(formatApiErrorMessage(error, "Could not create vendor."));
        }
      });
    })();
  };

  if (accessToken === null) {
    return <BoneyardInlineFallback name="field-register-vendor-auth" className="min-h-32" />;
  }

  return (
    <div className={fieldVendorPageClass}>
      <div>
        <p className="text-sm">
          <Link href="/dashboard/outlet-visits" className={calmMutedLinkClass}>
            Back to vendors
          </Link>
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Add vendor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Register a koko vendor with GPS and photos. You can record a visit on the next screen.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleCreateVendor}>
          <label className="text-sm">
            Business name
            <input
              className={fieldVendorInputClass}
              value={vendorForm.name}
              onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm">
            Vendor name
            <input
              className={fieldVendorInputClass}
              value={vendorForm.contactName}
              onChange={(e) => setVendorForm((f) => ({ ...f, contactName: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm">
            Primary phone
            <input
              className={fieldVendorInputClass}
              value={vendorForm.contactPhone}
              onChange={(e) => setVendorForm((f) => ({ ...f, contactPhone: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm">
            Secondary phone
            <input
              className={fieldVendorInputClass}
              value={vendorForm.contactPhoneSecondary}
              onChange={(e) =>
                setVendorForm((f) => ({ ...f, contactPhoneSecondary: e.target.value }))
              }
            />
          </label>
          <label className="text-sm">
            Vendor type
            <CatalogSelect
              value={vendorForm.category}
              options={catalogs.vendorTypes}
              onValueChange={(value) => setVendorForm((f) => ({ ...f, category: value }))}
            />
          </label>
          <label className="text-sm">
            Role
            <CatalogSelect
              value={vendorForm.vendorRole}
              options={catalogs.vendorRoles}
              onValueChange={(value) => setVendorForm((f) => ({ ...f, vendorRole: value }))}
            />
          </label>
          <label className="text-sm">
            Gender
            <CatalogSelect
              value={vendorForm.gender}
              options={catalogs.genders}
              onValueChange={(value) => setVendorForm((f) => ({ ...f, gender: value }))}
              allowEmpty
              emptyLabel="Select gender"
            />
          </label>
          <label className="text-sm">
            Age
            <CatalogSelect
              value={vendorForm.ageBracket}
              options={catalogs.ageBrackets}
              onValueChange={(value) => setVendorForm((f) => ({ ...f, ageBracket: value }))}
              allowEmpty
              emptyLabel="Select age"
            />
          </label>
          <label className="text-sm">
            Employees
            <CatalogSelect
              value={vendorForm.employeeCountBracket}
              options={catalogs.employeeCountBrackets}
              onValueChange={(value) =>
                setVendorForm((f) => ({ ...f, employeeCountBracket: value }))
              }
              allowEmpty
              emptyLabel="Select"
            />
          </label>
          <label className="text-sm">
            Average sales / day (GHS)
            <CatalogSelect
              value={vendorForm.averageDailySalesBracket}
              options={catalogs.averageDailySalesBrackets}
              onValueChange={(value) =>
                setVendorForm((f) => ({ ...f, averageDailySalesBracket: value }))
              }
              allowEmpty
              emptyLabel="Select"
            />
          </label>
          <label className="text-sm">
            Region
            <Select
              value={vendorForm.regionId.length > 0 ? vendorForm.regionId : SELECT_NONE}
              onValueChange={(value) =>
                setVendorForm((f) => ({ ...f, regionId: value === SELECT_NONE ? "" : value }))
              }
            >
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>Select region</SelectItem>
                {(regionsQuery.data ?? []).map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-sm">
            District
            <input
              className={fieldVendorInputClass}
              value={vendorForm.district}
              onChange={(e) => setVendorForm((f) => ({ ...f, district: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            Community
            <input
              className={fieldVendorInputClass}
              value={vendorForm.locationArea}
              onChange={(e) => setVendorForm((f) => ({ ...f, locationArea: e.target.value }))}
              placeholder="Optional — GPS will fill if blank"
            />
          </label>
          <label className="text-sm">
            Landmark
            <input
              className={fieldVendorInputClass}
              value={vendorForm.landmark}
              onChange={(e) => setVendorForm((f) => ({ ...f, landmark: e.target.value }))}
              placeholder="Optional — nearby landmark"
            />
          </label>
          <label className="text-sm">
            Years in business
            <input
              className={fieldVendorInputClass}
              inputMode="numeric"
              value={vendorForm.yearsInBusiness}
              onChange={(e) => setVendorForm((f) => ({ ...f, yearsInBusiness: e.target.value }))}
            />
          </label>
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            {PHOTO_CATEGORIES.map((cat) => (
              <OnboardingPhotoField
                key={cat.id}
                title={cat.label}
                description={cat.hint}
                buttonLabel={`Add ${cat.label}`}
                facingMode={cat.facingMode}
                photos={photos[cat.id] ?? []}
                onPhotosChange={(next) => {
                  setPhotos((prev) => ({
                    ...prev,
                    [cat.id]: typeof next === "function" ? next(prev[cat.id] ?? []) : next
                  }));
                }}
              />
            ))}
          </div>
          {vendorError ? (
            <p className="text-sm text-destructive sm:col-span-2">{vendorError}</p>
          ) : null}
          <div className="sm:col-span-2">
            <button
              type="submit"
              className={`${calmPrimaryButtonClass} lg:w-auto lg:min-w-56`}
              disabled={createVendorMutation.isPending || isCapturingVendorLocation}
            >
              {isCapturingVendorLocation
                ? "Getting GPS…"
                : createVendorMutation.isPending
                  ? "Saving…"
                  : "Register with GPS"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

type OnboardingPhotoFieldProps = {
  title: string;
  description: string;
  buttonLabel: string;
  facingMode: "user" | "environment";
  photos: string[];
  onPhotosChange: (photos: string[] | ((prev: string[]) => string[])) => void;
};

const OnboardingPhotoField = ({
  title,
  description,
  buttonLabel,
  facingMode,
  photos,
  onPhotosChange
}: OnboardingPhotoFieldProps): ReactElement => (
  <div>
    <p className="text-sm font-medium">{title}</p>
    <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    {photos.length > 0 ? (
      <div className="mt-2 flex flex-wrap gap-2">
        {photos.map((src, index) => (
          <div key={`${title}-${String(index)}`} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${title} ${String(index + 1)}`}
              className="h-20 w-20 rounded-md object-cover"
            />
            <button
              type="button"
              className="absolute right-1 top-1 rounded bg-background/90 px-1 text-[10px]"
              onClick={() => onPhotosChange((prev) => prev.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    ) : null}
    <div className="mt-2">
      <PhotoCapture
        onPhotoReady={(dataUrl) => onPhotosChange((prev) => [...prev, dataUrl])}
        facingMode={facingMode}
        description={description}
        openButtonLabel={buttonLabel}
      />
    </div>
  </div>
);
