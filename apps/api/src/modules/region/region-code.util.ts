/**
 * Ghana administrative region prefixes used in vendor IDs (Greater Accra → GA-001).
 */
export const GHANA_REGION_CODES: Readonly<Record<string, string>> = {
  ahafo: "AH",
  ashanti: "AS",
  bono: "BO",
  "bono-east": "BE",
  central: "CR",
  eastern: "ER",
  "greater-accra": "GA",
  "north-east": "NE",
  northern: "NR",
  oti: "OT",
  savannah: "SV",
  "upper-east": "UE",
  "upper-west": "UW",
  volta: "VR",
  western: "WR",
  "western-north": "WN"
};

const REGION_CODE_RE = /^[A-Z]{2,4}$/;

export const normalizeRegionCode = (value: string): string => value.trim().toUpperCase();

export const isValidRegionCode = (value: string): boolean => REGION_CODE_RE.test(value);

/**
 * Derive a 2–4 letter vendor-ID prefix from a region slug.
 */
export const deriveRegionCodeFromSlug = (slug: string): string => {
  const known = GHANA_REGION_CODES[slug];
  if (known !== undefined) {
    return known;
  }
  const letters = slug.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const stem = letters.slice(0, 2);
  return stem.length >= 2 ? stem : "RG";
};

export const formatVendorCode = (prefix: string, seq: number): string =>
  `${prefix}-${String(seq).padStart(3, "0")}`;
