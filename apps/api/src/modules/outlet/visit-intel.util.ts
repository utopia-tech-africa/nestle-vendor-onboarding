import type { OutletVisitKind, TrafficCategory } from "../../generated/prisma/client";
import type {
  CompetitorObservationInputDto,
  QuestionnaireResponseInputDto
} from "../me/dto/create-outlet-visit.dto";

export type VisitIntelFields = {
  nestleProductAvailable?: boolean | undefined;
  nestleProducts?: string[] | undefined;
  productPlacementNotes?: string | undefined;
  shelfVisibilityNotes?: string | undefined;
  posMaterialsPresent?: boolean | undefined;
  promotionalMaterialsPresent?: boolean | undefined;
  stockLevelNotes?: string | undefined;
  outOfStock?: boolean | undefined;
  competitors?: CompetitorObservationInputDto[] | undefined;
  questionnaire?: QuestionnaireResponseInputDto | undefined;
  issuedItemIds?: string[] | undefined;
  footfallEstimated?: number | undefined;
  footfallPeakPeriods?: string | undefined;
  trafficCategory?: TrafficCategory | undefined;
  footfallManualCount?: number | undefined;
};

export const visitVisibilityScore = (fields: VisitIntelFields): number | null => {
  const visibilityFlags = [
    fields.nestleProductAvailable === true,
    fields.posMaterialsPresent === true,
    fields.promotionalMaterialsPresent === true,
    fields.outOfStock !== true,
    (fields.shelfVisibilityNotes?.trim().length ?? 0) > 0,
    (fields.productPlacementNotes?.trim().length ?? 0) > 0
  ];
  const hasVisibilityInput =
    fields.nestleProductAvailable !== undefined ||
    fields.posMaterialsPresent !== undefined ||
    fields.promotionalMaterialsPresent !== undefined ||
    fields.outOfStock !== undefined ||
    fields.shelfVisibilityNotes !== undefined ||
    fields.productPlacementNotes !== undefined;
  if (!hasVisibilityInput) {
    return null;
  }
  return Math.round((visibilityFlags.filter(Boolean).length / visibilityFlags.length) * 100);
};

export const visitIncompleteReasons = (
  kind: OutletVisitKind,
  fields: VisitIntelFields
): string[] => {
  if (kind === "items") {
    return [];
  }
  const incompleteReasons: string[] = [];
  if (fields.questionnaire === undefined) {
    incompleteReasons.push("questionnaire");
  }
  if (fields.nestleProductAvailable === undefined && fields.outOfStock === undefined) {
    incompleteReasons.push("visibility");
  }
  return incompleteReasons;
};

export const mapCompetitorRows = (competitors: CompetitorObservationInputDto[] | undefined) =>
  (competitors ?? []).map((competitor) => ({
    brandName: competitor.brandName.trim(),
    brandNameOther: competitor.brandNameOther?.trim() ?? null,
    productsJson:
      competitor.products !== undefined && competitor.products.length > 0
        ? JSON.stringify(competitor.products)
        : null,
    pricingNotes: competitor.pricingNotes?.trim() ?? null,
    promotionsNotes: competitor.promotionsNotes?.trim() ?? null,
    discountsNotes: competitor.discountsNotes?.trim() ?? null,
    newLaunchesNotes: competitor.newLaunchesNotes?.trim() ?? null,
    displayQualityNotes: competitor.displayQualityNotes?.trim() ?? null,
    marketObservations: competitor.marketObservations?.trim() ?? null
  }));
