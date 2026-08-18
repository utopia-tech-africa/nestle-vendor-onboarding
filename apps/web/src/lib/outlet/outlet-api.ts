import { apiRequest } from "@/lib/api/http-client";
import type { FieldCatalogs } from "@/lib/outlet/field-catalogs";

export type OutletRecord = {
  id: string;
  vendorCode?: string;
  name: string;
  category: string;
  distributorName: string;
  locationArea: string;
  district: string | null;
  regionId: string | null;
  yearsInBusiness: number | null;
  latitude: number | null;
  longitude: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactPhoneSecondary: string | null;
  contactEmail: string | null;
  vendorRole: string | null;
  gender: string | null;
  ageBracket: string | null;
  employeeCountBracket: string | null;
  averageDailySalesBracket: string | null;
  landmark: string | null;
  isActive: boolean;
  region?: { id: string; name: string; slug: string } | null;
  onboardingPhotos?: OutletOnboardingPhoto[];
};

export type OutletOnboardingPhoto = {
  id: string;
  category: VisitPhotoCategory;
  cloudinaryUrl: string | null;
};

export const ONBOARDING_PHOTO_LABELS: Record<VisitPhotoCategory, string> = {
  vendor: "Vendor photo",
  shop: "Store photo",
  product_display: "Product display",
  shelf_visibility: "Shelf visibility",
  branding: "Branding materials",
  competitor: "Competitor photo"
};

export const vendorProfilePhotoUrl = (
  outlet: Pick<OutletRecord, "onboardingPhotos">
): string | null =>
  outlet.onboardingPhotos?.find((photo) => photo.category === "vendor" && photo.cloudinaryUrl)
    ?.cloudinaryUrl ?? null;

export const vendorGalleryPhotos = (
  outlet: Pick<OutletRecord, "onboardingPhotos">
): OutletOnboardingPhoto[] =>
  (outlet.onboardingPhotos ?? []).filter(
    (photo) => photo.category !== "vendor" && photo.cloudinaryUrl != null
  );

export type OutletProfileFields = {
  contactPhoneSecondary?: string;
  vendorRole?: string;
  gender?: string;
  ageBracket?: string;
  employeeCountBracket?: string;
  averageDailySalesBracket?: string;
  landmark?: string;
};

export type CreateOutletPayload = {
  name: string;
  category: string;
  distributorName?: string;
  locationArea?: string;
  district?: string;
  regionId?: string;
  yearsInBusiness?: number;
  latitude?: number;
  longitude?: number;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  isActive?: boolean;
} & OutletProfileFields;

/** Field promoter on-site vendor creation (GPS required). */
export type CreateFieldOutletPayload = {
  name: string;
  category: string;
  distributorName?: string;
  latitude: number;
  longitude: number;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  regionId?: string;
  district?: string;
  locationArea?: string;
  yearsInBusiness?: number;
  photos?: OutletVisitPhotoInput[];
} & OutletProfileFields;

export type UpdateOutletPayload = Partial<CreateOutletPayload>;

export const vendorLabel = (outlet: { vendorCode?: string | null; name: string }): string =>
  outlet.vendorCode != null && outlet.vendorCode.length > 0
    ? `${outlet.vendorCode} · ${outlet.name}`
    : outlet.name;

export type VisitPhotoCategory =
  | "vendor"
  | "shop"
  | "product_display"
  | "shelf_visibility"
  | "branding"
  | "competitor";

export type TrafficCategory = "LOW" | "MEDIUM" | "HIGH";

export type OutletVisitPhotoInput = {
  category: VisitPhotoCategory;
  cloudinaryPublicId?: string;
  photoBase64?: string;
};

export type CompetitorObservationInput = {
  brandName: string;
  brandNameOther?: string;
  products?: string[];
  pricingNotes?: string;
  promotionsNotes?: string;
  discountsNotes?: string;
  newLaunchesNotes?: string;
  displayQualityNotes?: string;
  marketObservations?: string;
};

export type QuestionnaireAnswerInput = {
  questionId: string;
  valueText?: string;
};

export type CreateOutletVisitPayload = {
  outletId: string;
  latitude: number;
  longitude: number;
  outletPhotoCloudinaryPublicId?: string;
  outletPhotoBase64?: string;
  photos?: OutletVisitPhotoInput[];
  stockAvailabilityNotes?: string;
  consumerEngagementNotes?: string;
  footfallEstimated?: number;
  footfallPeakPeriods?: string;
  trafficCategory?: TrafficCategory;
  footfallManualCount?: number;
  nestleProductAvailable?: boolean;
  nestleProducts?: string[];
  productPlacementNotes?: string;
  shelfVisibilityNotes?: string;
  posMaterialsPresent?: boolean;
  promotionalMaterialsPresent?: boolean;
  stockLevelNotes?: string;
  outOfStock?: boolean;
  competitors?: CompetitorObservationInput[];
  questionnaire?: {
    questionnaireId: string;
    answers: QuestionnaireAnswerInput[];
  };
  activationId?: string;
  saleItems?: { productId: string; quantity: number; sellingPrice: number }[];
};

export type OutletVisitRecord = {
  id: string;
  outletId: string;
  userId: string;
  latitude: number;
  longitude: number;
  hasOutletPhoto: boolean;
  stockAvailabilityNotes: string | null;
  consumerEngagementNotes: string | null;
  footfallEstimated?: number | null;
  footfallPeakPeriods?: string | null;
  trafficCategory?: TrafficCategory | null;
  footfallManualCount?: number | null;
  nestleProductAvailable?: boolean | null;
  nestleProductsJson?: string | null;
  productPlacementNotes?: string | null;
  shelfVisibilityNotes?: string | null;
  posMaterialsPresent?: boolean | null;
  promotionalMaterialsPresent?: boolean | null;
  stockLevelNotes?: string | null;
  outOfStock?: boolean | null;
  visibilityScore?: number | null;
  isComplete?: boolean;
  incompleteReasons?: string | null;
  checkedInAt: string;
  photos?: {
    id: string;
    category: VisitPhotoCategory;
    cloudinaryPublicId: string | null;
    cloudinaryUrl: string | null;
  }[];
  competitorObservations?: (CompetitorObservationInput & {
    id: string;
    brandNameOther?: string | null;
    productsJson?: string | null;
  })[];
  questionnaireResponses?: {
    id: string;
    questionnaireId: string;
    answers: {
      questionId: string;
      valueText: string | null;
      question?: { prompt: string; type: string } | null;
    }[];
  }[];
  outlet?: {
    id: string;
    vendorCode?: string;
    name: string;
    category: string;
    distributorName: string;
    locationArea: string;
    district?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  user?: {
    id: string;
    fullName: string;
    phone: string;
    role: string;
  };
};

export type QuestionnaireQuestion = {
  id: string;
  prompt: string;
  helpText: string | null;
  type: "text" | "textarea" | "number" | "single_choice" | "multi_choice" | "boolean";
  optionsJson: string | null;
  required: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type QuestionnaireRecord = {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  questions: QuestionnaireQuestion[];
};

export const listOutlets = async (token: string): Promise<OutletRecord[]> =>
  apiRequest<OutletRecord[]>("/admin/outlets", { token });

export const listFieldOutlets = async (token: string): Promise<OutletRecord[]> =>
  apiRequest<OutletRecord[]>("/me/outlets", { token });

export const listFieldRegions = async (
  token: string
): Promise<{ id: string; name: string; slug: string }[]> =>
  apiRequest<{ id: string; name: string; slug: string }[]>("/me/regions", { token });

export const getFieldCatalogs = async (token: string): Promise<FieldCatalogs> =>
  apiRequest<FieldCatalogs>("/me/catalogs", { token });

export type CatalogItemRecord = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CatalogCompetitorBrandRecord = CatalogItemRecord & {
  products: (CatalogItemRecord & { brandId: string })[];
};

export type AdminCatalogs = {
  nestleProducts: CatalogItemRecord[];
  competitorBrands: CatalogCompetitorBrandRecord[];
};

export const listAdminCatalogs = async (token: string): Promise<AdminCatalogs> =>
  apiRequest<AdminCatalogs>("/admin/catalogs", { token });

export type CatalogItemPayload = {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
};

export const createNestleProduct = async (
  token: string,
  payload: CatalogItemPayload
): Promise<CatalogItemRecord> =>
  apiRequest<CatalogItemRecord>("/admin/catalogs/nestle-products", {
    method: "POST",
    token,
    body: payload
  });

export const updateNestleProduct = async (
  token: string,
  id: string,
  payload: Partial<CatalogItemPayload>
): Promise<CatalogItemRecord> =>
  apiRequest<CatalogItemRecord>(`/admin/catalogs/nestle-products/${id}`, {
    method: "PATCH",
    token,
    body: payload
  });

export const deleteNestleProduct = async (token: string, id: string): Promise<{ ok: boolean }> =>
  apiRequest<{ ok: boolean }>(`/admin/catalogs/nestle-products/${id}`, { method: "DELETE", token });

export const createCompetitorBrand = async (
  token: string,
  payload: CatalogItemPayload
): Promise<CatalogCompetitorBrandRecord> =>
  apiRequest<CatalogCompetitorBrandRecord>("/admin/catalogs/competitor-brands", {
    method: "POST",
    token,
    body: payload
  });

export const updateCompetitorBrand = async (
  token: string,
  id: string,
  payload: Partial<CatalogItemPayload>
): Promise<CatalogCompetitorBrandRecord> =>
  apiRequest<CatalogCompetitorBrandRecord>(`/admin/catalogs/competitor-brands/${id}`, {
    method: "PATCH",
    token,
    body: payload
  });

export const deleteCompetitorBrand = async (token: string, id: string): Promise<{ ok: boolean }> =>
  apiRequest<{ ok: boolean }>(`/admin/catalogs/competitor-brands/${id}`, {
    method: "DELETE",
    token
  });

export const createCompetitorProduct = async (
  token: string,
  brandId: string,
  payload: CatalogItemPayload
): Promise<CatalogItemRecord & { brandId: string }> =>
  apiRequest<CatalogItemRecord & { brandId: string }>(
    `/admin/catalogs/competitor-brands/${brandId}/products`,
    { method: "POST", token, body: payload }
  );

export const updateCompetitorProduct = async (
  token: string,
  id: string,
  payload: Partial<CatalogItemPayload>
): Promise<CatalogItemRecord & { brandId: string }> =>
  apiRequest<CatalogItemRecord & { brandId: string }>(`/admin/catalogs/competitor-products/${id}`, {
    method: "PATCH",
    token,
    body: payload
  });

export const deleteCompetitorProduct = async (token: string, id: string): Promise<{ ok: boolean }> =>
  apiRequest<{ ok: boolean }>(`/admin/catalogs/competitor-products/${id}`, {
    method: "DELETE",
    token
  });

export const createFieldOutlet = async (
  token: string,
  payload: CreateFieldOutletPayload
): Promise<OutletRecord> =>
  apiRequest<OutletRecord>("/me/outlets", { method: "POST", token, body: payload });

export const createOutlet = async (
  token: string,
  payload: CreateOutletPayload
): Promise<OutletRecord> =>
  apiRequest<OutletRecord>("/admin/outlets", { method: "POST", token, body: payload });

export const updateOutlet = async (
  token: string,
  outletId: string,
  payload: UpdateOutletPayload
): Promise<OutletRecord> =>
  apiRequest<OutletRecord>(`/admin/outlets/${outletId}`, { method: "PATCH", token, body: payload });

export type CreateOutletVisitResponse = {
  visit: OutletVisitRecord;
};

export const createOutletVisit = async (
  token: string,
  payload: CreateOutletVisitPayload
): Promise<CreateOutletVisitResponse> =>
  apiRequest<CreateOutletVisitResponse>("/me/outlet-visits", {
    method: "POST",
    token,
    body: payload
  });

export const listMyOutletVisits = async (token: string, limit = 50): Promise<OutletVisitRecord[]> =>
  apiRequest<OutletVisitRecord[]>(`/me/outlet-visits?limit=${String(limit)}`, { token });

export type OutletVisitReportPage = {
  items: OutletVisitRecord[];
  total: number;
};

export const formatVisitCountLabel = (shown: number, total: number): string => {
  if (total === shown) {
    return `${String(total)} ${total === 1 ? "visit" : "visits"}`;
  }
  return `Showing ${String(shown)} of ${String(total)} visits`;
};

export const uniqueVisitPromoters = (
  visits: OutletVisitRecord[]
): { id: string; fullName: string; phone: string }[] => {
  const users = new Map<string, { id: string; fullName: string; phone: string }>();
  for (const row of visits) {
    if (row.user !== undefined) {
      users.set(row.user.id, {
        id: row.user.id,
        fullName: row.user.fullName,
        phone: row.user.phone
      });
    }
  }
  return [...users.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
};

export const listOutletVisitReports = async (
  token: string,
  params: {
    limit?: number;
    skip?: number;
    outletId?: string;
    userId?: string;
    from?: string;
    to?: string;
  }
): Promise<OutletVisitReportPage> => {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit ?? 100));
  query.set("skip", String(params.skip ?? 0));
  if (params.outletId !== undefined && params.outletId.trim().length > 0) {
    query.set("outletId", params.outletId.trim());
  }
  if (params.userId !== undefined && params.userId.trim().length > 0) {
    query.set("userId", params.userId.trim());
  }
  if (params.from !== undefined && params.from.trim().length > 0) {
    query.set("from", params.from.trim());
  }
  if (params.to !== undefined && params.to.trim().length > 0) {
    query.set("to", params.to.trim());
  }
  return apiRequest<OutletVisitReportPage>(`/admin/outlets/visits?${query.toString()}`, { token });
};

export const getActiveQuestionnaire = async (token: string): Promise<QuestionnaireRecord | null> =>
  apiRequest<QuestionnaireRecord | null>("/me/questionnaires/active", { token });

export const listQuestionnaires = async (token: string): Promise<QuestionnaireRecord[]> =>
  apiRequest<QuestionnaireRecord[]>("/admin/questionnaires", { token });

export const createQuestionnaire = async (
  token: string,
  payload: {
    title: string;
    description?: string;
    isActive?: boolean;
    questions?: {
      prompt: string;
      helpText?: string;
      type?: QuestionnaireQuestion["type"];
      options?: string[];
      required?: boolean;
      sortOrder?: number;
    }[];
  }
): Promise<QuestionnaireRecord> =>
  apiRequest<QuestionnaireRecord>("/admin/questionnaires", {
    method: "POST",
    token,
    body: payload
  });

export const updateQuestionnaire = async (
  token: string,
  id: string,
  payload: Partial<{
    title: string;
    description: string;
    isActive: boolean;
    questions: {
      prompt: string;
      helpText?: string;
      type?: QuestionnaireQuestion["type"];
      options?: string[];
      required?: boolean;
      sortOrder?: number;
    }[];
  }>
): Promise<QuestionnaireRecord> =>
  apiRequest<QuestionnaireRecord>(`/admin/questionnaires/${id}`, {
    method: "PATCH",
    token,
    body: payload
  });

export const seedDefaultQuestionnaire = async (token: string): Promise<QuestionnaireRecord> =>
  apiRequest<QuestionnaireRecord>("/admin/questionnaires/seed-default", {
    method: "POST",
    token
  });

export type NestleOverview = {
  vendorsOnboarded: number;
  activePromoters: number;
  dailyVisits: number;
  completedQuestionnaires: number;
  visibilityScoreAvg: number | null;
  competitorReports: number;
  footfall: {
    estimatedAvg: number | null;
    estimatedSum: number | null;
    manualSum: number | null;
  };
  incompleteVisits: number;
  unreadAlerts: number;
  regionalPerformance: {
    regionId: string | null;
    regionName: string;
    vendorCount: number;
  }[];
};

export const getNestleOverview = async (
  token: string,
  params?: { from?: string; to?: string; regionId?: string; userId?: string }
): Promise<NestleOverview> => {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.regionId) query.set("regionId", params.regionId);
  if (params?.userId) query.set("userId", params.userId);
  const qs = query.toString();
  return apiRequest<NestleOverview>(`/admin/nestle/overview${qs ? `?${qs}` : ""}`, { token });
};

export type VisitMapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  checkedInAt: string;
  visibilityScore: number | null;
  trafficCategory: TrafficCategory | null;
  isComplete: boolean;
  outlet: { id: string; name: string; regionId: string | null; locationArea: string };
  user: { id: string; fullName: string };
};

export const getVisitsMap = async (
  token: string,
  params?: { from?: string; to?: string; regionId?: string; userId?: string; limit?: number }
): Promise<VisitMapPoint[]> => {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.regionId) query.set("regionId", params.regionId);
  if (params?.userId) query.set("userId", params.userId);
  if (params?.limit !== undefined) query.set("limit", String(params.limit));
  const qs = query.toString();
  return apiRequest<VisitMapPoint[]>(`/admin/nestle/visits-map${qs ? `?${qs}` : ""}`, { token });
};

export type OpsAlertRecord = {
  id: string;
  kind: string;
  severity: string;
  title: string;
  message: string;
  metaJson: string | null;
  isRead: boolean;
  createdAt: string;
};

export const listOpsAlerts = async (token: string, limit = 100): Promise<OpsAlertRecord[]> =>
  apiRequest<OpsAlertRecord[]>(`/admin/alerts?limit=${String(limit)}`, { token });

export const markOpsAlertRead = async (token: string, id: string): Promise<OpsAlertRecord> =>
  apiRequest<OpsAlertRecord>(`/admin/alerts/${id}/read`, { method: "PATCH", token });

export const markAllOpsAlertsRead = async (token: string): Promise<{ ok: boolean }> =>
  apiRequest<{ ok: boolean }>("/admin/alerts/mark-all-read", { method: "POST", token });

export const reportSyncFailure = async (
  token: string,
  payload: { message?: string; pendingCount?: number }
): Promise<OpsAlertRecord> =>
  apiRequest<OpsAlertRecord>("/me/sync-failures", { method: "POST", token, body: payload });

export const downloadNestleCsvUrl = (params?: {
  kind?: "visits" | "vendors" | "competitors";
  from?: string;
  to?: string;
  regionId?: string;
  userId?: string;
}): string => {
  const query = new URLSearchParams();
  if (params?.kind) query.set("kind", params.kind);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.regionId) query.set("regionId", params.regionId);
  if (params?.userId) query.set("userId", params.userId);
  const qs = query.toString();
  return `/admin/nestle/export.csv${qs ? `?${qs}` : ""}`;
};

export const downloadNestlePdfUrl = (params?: {
  from?: string;
  to?: string;
  regionId?: string;
  userId?: string;
}): string => {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.regionId) query.set("regionId", params.regionId);
  if (params?.userId) query.set("userId", params.userId);
  const qs = query.toString();
  return `/admin/nestle/export.pdf${qs ? `?${qs}` : ""}`;
};
