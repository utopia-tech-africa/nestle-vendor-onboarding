export type CatalogOption = {
  value: string;
  label: string;
};

const option = (value: string, label = value): CatalogOption => ({ value, label });

export const VENDOR_TYPES: CatalogOption[] = [
  option("Koko seller"),
  option("Market stall"),
  option("Corner shop"),
  option("Street vendor"),
  option("Other")
];

export const VENDOR_ROLE_VALUES = ["owner", "worker"] as const;
export const GENDER_VALUES = ["male", "female", "other"] as const;
export const AGE_BRACKET_VALUES = [
  "under_18",
  "age_18_24",
  "age_25_34",
  "age_35_44",
  "age_45_54",
  "age_55_plus"
] as const;
export const EMPLOYEE_COUNT_BRACKET_VALUES = [
  "none",
  "one_two",
  "three_five",
  "six_ten",
  "eleven_plus"
] as const;
export const AVERAGE_DAILY_SALES_BRACKET_VALUES = [
  "under_50",
  "from_50_100",
  "from_100_200",
  "from_200_500",
  "from_500_plus"
] as const;
export const NESTLE_PRODUCT_VALUES = [
  "Milo",
  "Cerelac",
  "Nido",
  "Maggi",
  "Golden Morn",
  "Nescafé",
  "Lactogen",
  "Other"
] as const;
export const COMPETITOR_BRAND_VALUES = [
  "Ovaltine",
  "Cowbell",
  "Peak",
  "Cadbury",
  "Local koko",
  "Other"
] as const;
export const PEAK_PERIOD_VALUES = ["Morning", "Lunch", "Evening", "Night"] as const;

export const VENDOR_ROLES: CatalogOption[] = [
  option("owner", "Owner"),
  option("worker", "Worker")
];

export const GENDERS: CatalogOption[] = [
  option("male", "Male"),
  option("female", "Female"),
  option("other", "Other")
];

export const AGE_BRACKETS: CatalogOption[] = [
  option("under_18", "Under 18"),
  option("age_18_24", "18–24"),
  option("age_25_34", "25–34"),
  option("age_35_44", "35–44"),
  option("age_45_54", "45–54"),
  option("age_55_plus", "55+")
];

export const EMPLOYEE_COUNT_BRACKETS: CatalogOption[] = [
  option("none", "0"),
  option("one_two", "1–2"),
  option("three_five", "3–5"),
  option("six_ten", "6–10"),
  option("eleven_plus", "11+")
];

export const AVERAGE_DAILY_SALES_BRACKETS: CatalogOption[] = [
  option("under_50", "Under 50"),
  option("from_50_100", "50–100"),
  option("from_100_200", "100–200"),
  option("from_200_500", "200–500"),
  option("from_500_plus", "500+")
];

export const NESTLE_PRODUCTS: CatalogOption[] = [
  option("Milo"),
  option("Cerelac"),
  option("Nido"),
  option("Maggi"),
  option("Golden Morn"),
  option("Nescafé"),
  option("Lactogen"),
  option("Other")
];

export const COMPETITOR_BRANDS: CatalogOption[] = [
  option("Ovaltine"),
  option("Cowbell"),
  option("Peak"),
  option("Cadbury"),
  option("Local koko"),
  option("Other")
];

export const COMPETITOR_PRODUCTS_BY_BRAND: Record<string, CatalogOption[]> = {
  Ovaltine: [option("Ovaltine powder"), option("Ovaltine ready-to-drink"), option("Other")],
  Cowbell: [option("Cowbell chocolate"), option("Cowbell milk"), option("Other")],
  Peak: [option("Peak milk"), option("Peak chocolate"), option("Other")],
  Cadbury: [option("Cadbury cocoa"), option("Bournvita"), option("Other")],
  "Local koko": [option("Local koko"), option("Other")],
  Other: [option("Other")]
};

export const PEAK_PERIODS: CatalogOption[] = [
  option("Morning"),
  option("Lunch"),
  option("Evening"),
  option("Night")
];

export const VENDOR_TYPE_VALUES = VENDOR_TYPES.map((item) => item.value);

export type FieldCatalogs = {
  vendorTypes: CatalogOption[];
  vendorRoles: CatalogOption[];
  genders: CatalogOption[];
  ageBrackets: CatalogOption[];
  employeeCountBrackets: CatalogOption[];
  averageDailySalesBrackets: CatalogOption[];
  nestleProducts: CatalogOption[];
  competitorBrands: CatalogOption[];
  competitorProductsByBrand: Record<string, CatalogOption[]>;
  peakPeriods: CatalogOption[];
};

export const getFieldCatalogs = (): FieldCatalogs => ({
  vendorTypes: VENDOR_TYPES,
  vendorRoles: VENDOR_ROLES,
  genders: GENDERS,
  ageBrackets: AGE_BRACKETS,
  employeeCountBrackets: EMPLOYEE_COUNT_BRACKETS,
  averageDailySalesBrackets: AVERAGE_DAILY_SALES_BRACKETS,
  nestleProducts: NESTLE_PRODUCTS,
  competitorBrands: COMPETITOR_BRANDS,
  competitorProductsByBrand: COMPETITOR_PRODUCTS_BY_BRAND,
  peakPeriods: PEAK_PERIODS
});

export const catalogLabel = (options: CatalogOption[], value: string | null | undefined): string => {
  if (value == null || value.length === 0) {
    return "";
  }
  return options.find((item) => item.value === value)?.label ?? value;
};
