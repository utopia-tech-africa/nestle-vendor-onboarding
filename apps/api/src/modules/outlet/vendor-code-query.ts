/** Candidate vendor IDs to try for a lookup typed by a human (GA-001, ga001, GA 001). */
export const vendorCodeLookupCandidates = (raw: string): string[] => {
  const compact = raw.trim().toUpperCase().replace(/[\s_]+/g, "");
  if (compact.length === 0) {
    return [];
  }
  const candidates = [compact];
  const noHyphen = compact.replace(/-/g, "");
  const match = /^([A-Z]{2,4})(\d{1,6})$/.exec(noHyphen);
  const prefix = match?.[1];
  const digits = match?.[2];
  if (prefix !== undefined && digits !== undefined) {
    const seq = digits.replace(/^0+(?=\d)/, "") || "0";
    const padded = seq.padStart(3, "0");
    candidates.push(`${prefix}-${padded}`);
    candidates.push(`${prefix}-${seq}`);
    candidates.push(`${prefix}${padded}`);
  }
  return [...new Set(candidates)];
};

export const phoneLookupDigits = (raw: string): string => raw.replace(/\D/g, "");

/**
 * Needle for matching stored Ghana numbers (0244…, +233…, spaced).
 * Last 9 digits cover local 0-prefix and 233-prefix forms of the same line.
 */
export const phoneLookupNeedle = (raw: string): string | null => {
  const digits = phoneLookupDigits(raw);
  if (digits.length >= 9) {
    return digits.slice(-9);
  }
  if (digits.length >= 7) {
    return digits;
  }
  return null;
};

export const looksLikeVendorCodeQuery = (raw: string): boolean => /[A-Za-z]/.test(raw.trim());
