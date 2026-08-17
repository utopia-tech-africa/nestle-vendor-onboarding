import type { Metadata, Viewport } from "next";
import { Geist_Mono, JetBrains_Mono } from "next/font/google";

import "@/bones/registry";
import { AppToaster } from "@/components/app-toaster";
import { BaseUiProvider } from "@/components/base-ui-provider";
import { BoneyardAppSetup } from "@/components/boneyard/boneyard-app-setup";
import { PwaInstallProvider } from "@/components/pwa-install-context";
import { PwaInstallUi } from "@/components/pwa-install-prompt";
import { PwaProvider } from "@/components/pwa-provider";
import { QueryProvider } from "@/components/query-provider";

import {
  APP_DESCRIPTION,
  APP_NAME,
  FAVICON_16_SRC,
  FAVICON_32_SRC,
  ICON_192_SRC,
  ICON_512_SRC,
  LOGO_SRC,
  NESTLE_PRIMARY
} from "@/lib/brand";

import "./globals.css";

const fontSans = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-sans"
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    apple: [{ url: ICON_192_SRC, sizes: "192x192", type: "image/png" }],
    icon: [
      { url: LOGO_SRC, type: "image/svg+xml" },
      { url: FAVICON_32_SRC, sizes: "32x32", type: "image/png" },
      { url: FAVICON_16_SRC, sizes: "16x16", type: "image/png" },
      { url: ICON_192_SRC, sizes: "192x192", type: "image/png" },
      { url: ICON_512_SRC, sizes: "512x512", type: "image/png" }
    ],
    shortcut: FAVICON_32_SRC
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: APP_DESCRIPTION
  }
};

export const viewport: Viewport = {
  themeColor: NESTLE_PRIMARY,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground font-sans">
        <PwaProvider>
          <BoneyardAppSetup>
            <BaseUiProvider>
              <QueryProvider>
                <PwaInstallProvider>
                  {children}
                  <PwaInstallUi />
                  <AppToaster />
                </PwaInstallProvider>
              </QueryProvider>
            </BaseUiProvider>
          </BoneyardAppSetup>
        </PwaProvider>
      </body>
    </html>
  );
}
