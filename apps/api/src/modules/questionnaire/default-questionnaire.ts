import {
  AGE_BRACKETS,
  AVERAGE_DAILY_SALES_BRACKETS,
  COMPETITOR_BRANDS,
  COMPETITOR_PRODUCTS_BY_BRAND,
  EMPLOYEE_COUNT_BRACKETS,
  GENDERS,
  NESTLE_PRODUCTS,
  PEAK_PERIODS,
  SELLER_TYPE_QUESTION_PROMPT,
  VENDOR_ROLES,
  VENDOR_TYPES,
  VENDOR_TYPE_QUESTION_PROMPT,
  VENDOR_TYPE_VALUES_BY_TYPE,
  sellerTypeValues,
  type CatalogOption
} from "../outlet/field-catalogs";
import type { CreateQuestionnaireDto } from "./dto/questionnaire.dto";
import { QuestionTypeDto as QuestionTypeEnum } from "./dto/questionnaire.dto";

export const DEFAULT_QUESTIONNAIRE_TITLE = "Nestlé vendor questionnaire";
export const DEFAULT_QUESTIONNAIRE_DESCRIPTION =
  "Vendor profile and market intelligence questions for koko vendor visits. Choice options match Ops catalogs.";

const labels = (options: CatalogOption[]): string[] => options.map((item) => item.label);

const uniqueLabels = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
};

export const competitorProductLabelsFromCatalog = (
  byBrand: Record<string, CatalogOption[]>
): string[] =>
  uniqueLabels(
    Object.entries(byBrand).flatMap(([brand, items]) =>
      items.map((item) => {
        const label = item.label.trim();
        if (label.toLowerCase() === "other") {
          return `${brand} — Other`;
        }
        return label;
      })
    )
  );

export type DefaultQuestionnaireQuestion = NonNullable<CreateQuestionnaireDto["questions"]>[number];

export const buildDefaultQuestionnaireQuestions = (overrides?: {
  nestleProducts?: string[];
  competitorBrands?: string[];
  competitorProducts?: string[];
  vendorTypes?: string[];
  sellerTypes?: string[];
}): DefaultQuestionnaireQuestion[] => {
  const nestleProducts = uniqueLabels(overrides?.nestleProducts ?? labels(NESTLE_PRODUCTS));
  const competitorBrands = uniqueLabels(overrides?.competitorBrands ?? labels(COMPETITOR_BRANDS));
  const competitorProducts = uniqueLabels(
    overrides?.competitorProducts ?? competitorProductLabelsFromCatalog(COMPETITOR_PRODUCTS_BY_BRAND)
  );
  const vendorTypes = uniqueLabels(overrides?.vendorTypes ?? labels(VENDOR_TYPES));
  const sellerTypes = uniqueLabels(
    overrides?.sellerTypes ?? labels(sellerTypeValues(VENDOR_TYPE_VALUES_BY_TYPE))
  );

  return [
    {
      prompt: VENDOR_TYPE_QUESTION_PROMPT,
      type: QuestionTypeEnum.single_choice,
      options: vendorTypes,
      required: true,
      sortOrder: 0
    },
    {
      prompt: SELLER_TYPE_QUESTION_PROMPT,
      helpText: "Choose the seller type under the vendor type selected above.",
      type: QuestionTypeEnum.single_choice,
      options: sellerTypes,
      required: true,
      sortOrder: 1
    },
    {
      prompt: "Is the vendor the owner or an employee?",
      helpText: "Owner of the stall, or a worker/employee.",
      type: QuestionTypeEnum.single_choice,
      options: labels(VENDOR_ROLES).map((label) => (label === "Worker" ? "Employee" : label)),
      required: true,
      sortOrder: 2
    },
    {
      prompt: "Vendor gender",
      type: QuestionTypeEnum.single_choice,
      options: labels(GENDERS),
      required: true,
      sortOrder: 3
    },
    {
      prompt: "Vendor age",
      type: QuestionTypeEnum.single_choice,
      options: labels(AGE_BRACKETS),
      required: true,
      sortOrder: 4
    },
    {
      prompt: "Number of employees",
      type: QuestionTypeEnum.single_choice,
      options: labels(EMPLOYEE_COUNT_BRACKETS),
      required: true,
      sortOrder: 5
    },
    {
      prompt: "Average sales per day (GHS)",
      type: QuestionTypeEnum.single_choice,
      options: labels(AVERAGE_DAILY_SALES_BRACKETS),
      required: false,
      sortOrder: 6
    },
    {
      prompt: "Nestlé products currently sold",
      type: QuestionTypeEnum.multi_choice,
      options: nestleProducts,
      required: true,
      sortOrder: 7
    },
    {
      prompt: "Competitor brands present",
      type: QuestionTypeEnum.multi_choice,
      options: competitorBrands,
      required: false,
      sortOrder: 8
    },
    {
      prompt: "Competitor products seen",
      type: QuestionTypeEnum.multi_choice,
      options: competitorProducts,
      required: false,
      sortOrder: 9
    },
    {
      prompt: "Estimated customer footfall",
      helpText: "Typical number of customers at this stall in a day.",
      type: QuestionTypeEnum.number,
      required: false,
      sortOrder: 10
    },
    {
      prompt: "Peak shopping periods",
      type: QuestionTypeEnum.multi_choice,
      options: labels(PEAK_PERIODS),
      required: false,
      sortOrder: 11
    },
    {
      prompt: "Traffic category",
      type: QuestionTypeEnum.single_choice,
      options: ["Low", "Medium", "High"],
      required: false,
      sortOrder: 12
    },
    {
      prompt: "Manual footfall count",
      helpText: "Optional count you did during this visit.",
      type: QuestionTypeEnum.number,
      required: false,
      sortOrder: 13
    },
    {
      prompt: "Interest in stocking Nestlé products",
      type: QuestionTypeEnum.single_choice,
      options: ["Yes", "No", "Maybe"],
      required: true,
      sortOrder: 14
    },
    {
      prompt: "Preferred supplier",
      type: QuestionTypeEnum.text,
      required: false,
      sortOrder: 15
    },
    {
      prompt: "Challenges faced",
      type: QuestionTypeEnum.textarea,
      required: false,
      sortOrder: 16
    },
    {
      prompt: "Existing promotions",
      type: QuestionTypeEnum.textarea,
      required: false,
      sortOrder: 17
    },
    {
      prompt: "Additional comments",
      type: QuestionTypeEnum.textarea,
      required: false,
      sortOrder: 18
    }
  ];
};
