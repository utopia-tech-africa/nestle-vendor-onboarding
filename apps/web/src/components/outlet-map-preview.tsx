"use client";

import dynamic from "next/dynamic";
import { type ReactElement } from "react";

import { BoneyardBlock } from "@/components/boneyard/boneyard-block";

const GeofenceLeafletMap = dynamic(
  () => import("@/components/geofence-leaflet-map").then((m) => m.GeofenceLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-48 w-full items-center justify-center rounded-lg border border-border bg-muted/30"
        aria-hidden
      >
        <BoneyardBlock
          name="outlet-map-preview-loading"
          loading
          variant="lines4"
          className="w-full max-w-xs px-4"
        >
          <span className="sr-only">Loading map</span>
        </BoneyardBlock>
      </div>
    )
  }
);

const OUTLET_PIN_RADIUS_METERS = 12;

export type OutletMapPreviewProps = {
  latitude: number;
  longitude: number;
  locationArea?: string;
};

export const outletMapsUrl = (latitude: number, longitude: number): string =>
  `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

export const OutletMapPreview = ({
  latitude,
  longitude,
  locationArea
}: OutletMapPreviewProps): ReactElement => {
  return (
    <div className="space-y-2">
      {locationArea !== undefined && locationArea.trim().length > 0 ? (
        <p className="text-sm text-foreground">
          <span className="font-medium">Registered location:</span> {locationArea}
        </p>
      ) : null}
      <div className="pointer-events-none">
        <GeofenceLeafletMap
          latitude={latitude}
          longitude={longitude}
          radiusMeters={OUTLET_PIN_RADIUS_METERS}
          onLocationPick={() => {
            /* read-only preview */
          }}
        />
      </div>
      <a
        href={outletMapsUrl(latitude, longitude)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        Open in Google Maps
      </a>
    </div>
  );
};
