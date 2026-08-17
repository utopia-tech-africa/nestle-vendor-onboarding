/** Central brand strings, Ideal + Carnation palette, and asset paths for the web app. */
export const APP_NAME = "Nestlé Ghana";
export const APP_SHORT_NAME = "Nestlé";
export const APP_DESCRIPTION =
  "Vendor onboarding and field monitoring for Nestlé Ghana koko vendors.";

/**
 * Dual-brand palette — Ideal Milk (cream tin, gold banner) and Carnation Milk (crimson).
 */
export const CARNATION_RED = "#c8102e";
export const CARNATION_RED_DEEP = "#8b0e22";
export const CARNATION_ROSE = "#e85a6b";
export const CARNATION_BLUSH = "#fce8eb";

export const IDEAL_CREAM = "#fff8ee";
export const IDEAL_GOLD = "#f0c014";
export const IDEAL_GOLD_DEEP = "#c99208";
export const IDEAL_COCOA = "#3d181c";

/** @deprecated Use Carnation / Ideal tokens. Kept so existing imports keep working. */
export const IDEAL_NAVY = IDEAL_COCOA;
export const IDEAL_BLUE = CARNATION_RED;
export const IDEAL_BLUE_MID = CARNATION_ROSE;
export const IDEAL_BLUE_LIGHT = CARNATION_BLUSH;
export const NESTLE_BROWN_DARKEST = IDEAL_COCOA;
export const NESTLE_BROWN_DARK = CARNATION_RED;
export const NESTLE_BROWN_MID = CARNATION_ROSE;
export const NESTLE_BROWN_LIGHT = CARNATION_BLUSH;
export const NESTLE_BROWN_LIGHTEST = IDEAL_CREAM;

/** Primary brand color — used for theme-color / PWA chrome. */
export const NESTLE_PRIMARY = CARNATION_RED;

/** Nestlé bird mark (`public/icons/logo.svg`). */
export const LOGO_SRC = "/icons/logo.svg";

/** Intrinsic SVG viewBox size (used for Next/Image aspect ratio). */
export const LOGO_WIDTH = 158;
export const LOGO_HEIGHT = 113;

/** Square favicons / PWA icons generated from the SVG. */
export const FAVICON_16_SRC = "/icons/favicon-16.png";
export const FAVICON_32_SRC = "/icons/favicon-32.png";
export const ICON_192_SRC = "/icons/icon-192.png";
export const ICON_512_SRC = "/icons/icon-512.png";
