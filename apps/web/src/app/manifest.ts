import type { MetadataRoute } from "next";

import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
  ICON_192_SRC,
  ICON_512_SRC,
  LOGO_SRC,
  NESTLE_PRIMARY
} from "@/lib/brand";

const THEME = NESTLE_PRIMARY;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fff8ee",
    theme_color: THEME,
    categories: ["business", "productivity"],
    icons: [
      {
        src: LOGO_SRC,
        sizes: "158x113",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: ICON_192_SRC,
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: ICON_512_SRC,
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: ICON_512_SRC,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
