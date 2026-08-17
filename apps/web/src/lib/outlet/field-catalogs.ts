export type CatalogOption = {
  value: string;
  label: string;
};

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

const option = (value: string, label = value): CatalogOption => ({ value, label });

/** Offline / first-paint fallback matching API `field-catalogs.ts`. */
export const FALLBACK_FIELD_CATALOGS: FieldCatalogs = {
  vendorTypes: [
    option("Koko seller"),
    option("Market stall"),
    option("Corner shop"),
    option("Street vendor"),
    option("Other")
  ],
  vendorRoles: [option("owner", "Owner"), option("worker", "Worker")],
  genders: [option("male", "Male"), option("female", "Female"), option("other", "Other")],
  ageBrackets: [
    option("under_18", "Under 18"),
    option("age_18_24", "18–24"),
    option("age_25_34", "25–34"),
    option("age_35_44", "35–44"),
    option("age_45_54", "45–54"),
    option("age_55_plus", "55+")
  ],
  employeeCountBrackets: [
    option("none", "0"),
    option("one_two", "1–2"),
    option("three_five", "3–5"),
    option("six_ten", "6–10"),
    option("eleven_plus", "11+")
  ],
  averageDailySalesBrackets: [
    option("under_50", "Under 50"),
    option("from_50_100", "50–100"),
    option("from_100_200", "100–200"),
    option("from_200_500", "200–500"),
    option("from_500_plus", "500+")
  ],
  nestleProducts: [
    option("Milo"),
    option("Cerelac"),
    option("Nido"),
    option("Maggi"),
    option("Golden Morn"),
    option("Nescafé"),
    option("Lactogen"),
    option("Other")
  ],
  competitorBrands: [
    option("Ovaltine"),
    option("Cowbell"),
    option("Peak"),
    option("Cadbury"),
    option("Local koko"),
    option("Other")
  ],
  competitorProductsByBrand: {
    Ovaltine: [option("Ovaltine powder"), option("Ovaltine ready-to-drink"), option("Other")],
    Cowbell: [option("Cowbell chocolate"), option("Cowbell milk"), option("Other")],
    Peak: [option("Peak milk"), option("Peak chocolate"), option("Other")],
    Cadbury: [option("Cadbury cocoa"), option("Bournvita"), option("Other")],
    "Local koko": [option("Local koko"), option("Other")],
    Other: [option("Other")]
  },
  peakPeriods: [option("Morning"), option("Lunch"), option("Evening"), option("Night")]
};

export const catalogLabel = (
  options: CatalogOption[],
  value: string | null | undefined
): string => {
  if (value == null || value.length === 0) {
    return "";
  }
  return options.find((item) => item.value === value)?.label ?? value;
};

export const parseJsonStringArray = (raw: string | null | undefined): string[] => {
  if (raw == null || raw.trim().length === 0) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // comma-separated fallback
  }
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

export const toggleCatalogValue = (selected: string[], value: string): string[] =>
  selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
