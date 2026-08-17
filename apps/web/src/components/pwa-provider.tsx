"use client";

import { SerwistProvider } from "@serwist/next/react";
import { type PropsWithChildren, type ReactElement, useEffect } from "react";

const isDev = process.env.NODE_ENV === "development";

/**
 * Registers the Serwist service worker in production so the app can be installed and cached.
 * Disabled in development to avoid stale caches while iterating.
 * Uses `type: "classic"` because Serwist emits a non-ESM worker bundle; the library default is
 * `module`, which causes registration to fail and hides the install prompt.
 */
export const PwaProvider = ({ children }: PropsWithChildren): ReactElement => {
  useEffect(() => {
    if (!isDev || !("serviceWorker" in navigator)) {
      return;
    }

    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      if (registrations.length > 0) {
        window.location.reload();
      }
    })();
  }, []);

  return (
    <SerwistProvider swUrl="/sw.js" disable={isDev} options={{ type: "classic" }}>
      {children}
    </SerwistProvider>
  );
};
