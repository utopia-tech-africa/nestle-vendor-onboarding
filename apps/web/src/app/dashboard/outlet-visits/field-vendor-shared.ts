import { toPendingOutletId, type PendingLocalVendor } from "@/lib/field/field-offline-idb";
import type {
  CompetitorObservationInput,
  OutletRecord,
  QuestionnaireQuestion,
  VisitIntelPayload,
  VisitPhotoCategory
} from "@/lib/outlet/outlet-api";

export const fieldVendorInputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const fieldVendorPageClass = "flex w-full flex-col gap-6 pb-8";

export const SELECT_NONE = "__none__";

export const fieldOutletsQueryKey = ["field", "outlets"] as const;
export const fieldRegionsQueryKey = ["field", "regions"] as const;
export const fieldCatalogsQueryKey = ["field", "catalogs"] as const;
export const activeQuestionnaireKey = ["field", "questionnaire", "active"] as const;

export const PHOTO_CATEGORIES: {
  id: VisitPhotoCategory;
  label: string;
  hint: string;
  facingMode: "user" | "environment";
}[] = [
  {
    id: "vendor",
    label: "Vendor photo",
    hint: "The vendor's face at the stall. Use the back camera, or switch to the front if needed.",
    facingMode: "environment"
  },
  {
    id: "shop",
    label: "Store photo",
    hint: "The stall or shop front from outside.",
    facingMode: "environment"
  },
  {
    id: "product_display",
    label: "Product display",
    hint: "Nestlé products as they are set out.",
    facingMode: "environment"
  },
  {
    id: "shelf_visibility",
    label: "Shelf visibility",
    hint: "How Nestlé looks on the shelf.",
    facingMode: "environment"
  },
  {
    id: "branding",
    label: "Branding materials",
    hint: "Posters, umbrellas, or other Nestlé branding.",
    facingMode: "environment"
  },
  {
    id: "competitor",
    label: "Competitor photo",
    hint: "Competing brands on display nearby.",
    facingMode: "environment"
  }
];

export type NewVendorFormState = {
  name: string;
  vendorTypeGroup: string;
  category: string;
  contactName: string;
  contactPhone: string;
  contactPhoneSecondary: string;
  vendorRole: string;
  gender: string;
  ageBracket: string;
  employeeCountBracket: string;
  averageDailySalesBracket: string;
  landmark: string;
  district: string;
  locationArea: string;
  regionId: string;
  yearsInBusiness: string;
};

export type CompetitorDraft = CompetitorObservationInput & { key: string };

export const blankVendorForm = (regionId = ""): NewVendorFormState => ({
  name: "",
  vendorTypeGroup: "Table top",
  category: "Koko seller",
  contactName: "",
  contactPhone: "",
  contactPhoneSecondary: "",
  vendorRole: "owner",
  gender: "",
  ageBracket: "",
  employeeCountBracket: "",
  averageDailySalesBracket: "",
  landmark: "",
  district: "",
  locationArea: "",
  regionId,
  yearsInBusiness: ""
});

export const blankCompetitor = (): CompetitorDraft => ({
  key: crypto.randomUUID(),
  brandName: "",
  brandNameOther: "",
  products: [],
  pricingNotes: "",
  promotionsNotes: "",
  discountsNotes: "",
  newLaunchesNotes: "",
  displayQualityNotes: "",
  marketObservations: ""
});

export const parseQuestionOptions = (optionsJson: string | null): string[] => {
  if (!optionsJson) return [];
  try {
    const parsed = JSON.parse(optionsJson) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

export const parseMultiChoiceAnswer = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const serializeMultiChoiceAnswer = (values: string[]): string => values.join(", ");

export const competitorPayloadFromDrafts = (
  competitors: CompetitorDraft[]
): CompetitorObservationInput[] =>
  competitors
    .filter((competitor) => competitor.brandName.trim().length > 0)
    .map((competitor) => ({
      brandName: competitor.brandName.trim(),
      ...(competitor.brandName === "Other" && competitor.brandNameOther?.trim()
        ? { brandNameOther: competitor.brandNameOther.trim() }
        : {}),
      ...(competitor.products && competitor.products.length > 0
        ? { products: competitor.products }
        : {}),
      ...(competitor.pricingNotes?.trim() ? { pricingNotes: competitor.pricingNotes.trim() } : {}),
      ...(competitor.promotionsNotes?.trim()
        ? { promotionsNotes: competitor.promotionsNotes.trim() }
        : {}),
      ...(competitor.discountsNotes?.trim()
        ? { discountsNotes: competitor.discountsNotes.trim() }
        : {}),
      ...(competitor.newLaunchesNotes?.trim()
        ? { newLaunchesNotes: competitor.newLaunchesNotes.trim() }
        : {}),
      ...(competitor.displayQualityNotes?.trim()
        ? { displayQualityNotes: competitor.displayQualityNotes.trim() }
        : {}),
      ...(competitor.marketObservations?.trim()
        ? { marketObservations: competitor.marketObservations.trim() }
        : {})
    }));

export const visitIntelPayload = (input: {
  nestleProductAvailable: boolean | null;
  nestleProducts: string[];
  productPlacementNotes: string;
  shelfVisibilityNotes: string;
  posMaterialsPresent: boolean | null;
  promotionalMaterialsPresent: boolean | null;
  stockLevelNotes: string;
  outOfStock: boolean | null;
  competitors: CompetitorDraft[];
  questionnaire: { id: string; questions: QuestionnaireQuestion[] } | null | undefined;
  answers: Record<string, string>;
  issuedItemIds: string[];
}): VisitIntelPayload => {
  const competitorPayload = competitorPayloadFromDrafts(input.competitors);
  const questionnairePayload =
    input.questionnaire != null
      ? {
          questionnaireId: input.questionnaire.id,
          answers: input.questionnaire.questions.map((question) => {
            const value = input.answers[question.id]?.trim() ?? "";
            return {
              questionId: question.id,
              ...(value.length > 0 ? { valueText: value } : {})
            };
          })
        }
      : undefined;
  return {
    ...(input.nestleProductAvailable !== null || input.nestleProducts.length > 0
      ? {
          nestleProductAvailable:
            input.nestleProductAvailable === true || input.nestleProducts.length > 0
        }
      : {}),
    ...(input.nestleProducts.length > 0 ? { nestleProducts: input.nestleProducts } : {}),
    ...(input.productPlacementNotes.trim()
      ? { productPlacementNotes: input.productPlacementNotes.trim() }
      : {}),
    ...(input.shelfVisibilityNotes.trim()
      ? { shelfVisibilityNotes: input.shelfVisibilityNotes.trim() }
      : {}),
    ...(input.posMaterialsPresent !== null
      ? { posMaterialsPresent: input.posMaterialsPresent }
      : {}),
    ...(input.promotionalMaterialsPresent !== null
      ? { promotionalMaterialsPresent: input.promotionalMaterialsPresent }
      : {}),
    ...(input.stockLevelNotes.trim() ? { stockLevelNotes: input.stockLevelNotes.trim() } : {}),
    ...(input.outOfStock !== null ? { outOfStock: input.outOfStock } : {}),
    ...(competitorPayload.length > 0 ? { competitors: competitorPayload } : {}),
    ...(questionnairePayload !== undefined ? { questionnaire: questionnairePayload } : {}),
    ...(input.issuedItemIds.length > 0 ? { issuedItemIds: input.issuedItemIds } : {})
  };
};

export const pendingVendorsToRecords = (pendingVendors: PendingLocalVendor[]): OutletRecord[] =>
  pendingVendors.map((vendor) => ({
    id: toPendingOutletId(vendor.localId),
    name: `${vendor.name} (offline)`,
    vendorTypeGroup: vendor.vendorTypeGroup ?? null,
    category: vendor.category,
    distributorName: "N/A",
    locationArea: vendor.locationArea ?? "",
    district: vendor.district ?? null,
    regionId: vendor.regionId ?? null,
    yearsInBusiness: vendor.yearsInBusiness ?? null,
    latitude: vendor.latitude,
    longitude: vendor.longitude,
    contactName: vendor.contactName,
    contactPhone: vendor.contactPhone,
    contactPhoneSecondary: vendor.contactPhoneSecondary ?? null,
    contactEmail: null,
    vendorRole: vendor.vendorRole ?? null,
    gender: vendor.gender ?? null,
    ageBracket: vendor.ageBracket ?? null,
    employeeCountBracket: vendor.employeeCountBracket ?? null,
    averageDailySalesBracket: vendor.averageDailySalesBracket ?? null,
    landmark: vendor.landmark ?? null,
    isActive: true
  }));

export const optionalProfilePayload = (
  form: NewVendorFormState
): {
  contactPhoneSecondary?: string;
  vendorRole?: string;
  gender?: string;
  ageBracket?: string;
  employeeCountBracket?: string;
  averageDailySalesBracket?: string;
  landmark?: string;
} => ({
  ...(form.contactPhoneSecondary.trim()
    ? { contactPhoneSecondary: form.contactPhoneSecondary.trim() }
    : {}),
  ...(form.vendorRole ? { vendorRole: form.vendorRole } : {}),
  ...(form.gender ? { gender: form.gender } : {}),
  ...(form.ageBracket ? { ageBracket: form.ageBracket } : {}),
  ...(form.employeeCountBracket ? { employeeCountBracket: form.employeeCountBracket } : {}),
  ...(form.averageDailySalesBracket
    ? { averageDailySalesBracket: form.averageDailySalesBracket }
    : {}),
  ...(form.landmark.trim() ? { landmark: form.landmark.trim() } : {})
});
