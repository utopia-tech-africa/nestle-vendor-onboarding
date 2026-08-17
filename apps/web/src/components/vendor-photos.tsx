"use client";

import { type ReactElement } from "react";

import {
  ONBOARDING_PHOTO_LABELS,
  vendorGalleryPhotos,
  vendorProfilePhotoUrl,
  type OutletOnboardingPhoto,
  type OutletRecord
} from "@/lib/outlet/outlet-api";
import { cn } from "@/lib/utils";

const initialsFromName = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const sizeClass = {
  sm: "size-9 text-[11px]",
  md: "size-11 text-xs",
  lg: "size-20 text-lg"
} as const;

export function VendorAvatar({
  outlet,
  size = "md",
  className
}: {
  outlet: Pick<OutletRecord, "name" | "onboardingPhotos">;
  size?: keyof typeof sizeClass;
  className?: string;
}): ReactElement {
  const url = vendorProfilePhotoUrl(outlet);
  if (url != null) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`${outlet.name} vendor photo`}
        className={cn(
          "shrink-0 rounded-full object-cover ring-1 ring-border",
          sizeClass[size],
          className
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-1 ring-border",
        sizeClass[size],
        className
      )}
      aria-hidden
    >
      {initialsFromName(outlet.name)}
    </div>
  );
}

export function VendorPhotoGallery({
  outlet,
  className
}: {
  outlet: Pick<OutletRecord, "onboardingPhotos">;
  className?: string;
}): ReactElement | null {
  const photos = vendorGalleryPhotos(outlet);
  if (photos.length === 0) {
    return null;
  }
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground">Shop photos</p>
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo) => (
          <li key={photo.id}>
            <OnboardingPhotoThumb photo={photo} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function OnboardingPhotoThumb({ photo }: { photo: OutletOnboardingPhoto }): ReactElement {
  const url = photo.cloudinaryUrl;
  const label = ONBOARDING_PHOTO_LABELS[photo.category];
  if (url == null) {
    return (
      <span className="block rounded-md border border-border px-2 py-6 text-center text-[10px] uppercase text-muted-foreground">
        {label}
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-md border border-border bg-muted/30"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="aspect-square w-full object-cover" />
      <span className="block truncate px-2 py-1 text-[10px] text-muted-foreground">{label}</span>
    </a>
  );
}
