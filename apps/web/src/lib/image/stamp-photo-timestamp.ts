import { shortenPlaceNameForDisplay } from "@/lib/format-short-place-name";
import { requestCurrentPosition } from "@/lib/geolocation/request-current-position";

const PHOTO_STAMP_TIMEZONE = "Africa/Accra";

const stampFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: PHOTO_STAMP_TIMEZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error("Could not load image for timestamp stamp"));
    };
    image.src = src;
  });

export const formatPhotoTimestamp = (at: Date = new Date()): string => stampFormatter.format(at);

export const formatPhotoCoordLabel = (latitude: number, longitude: number): string =>
  `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

export type PhotoStampLocation = {
  latitude: number;
  longitude: number;
  placeLabel?: string | null;
};

const fitText = (context: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }
  let next = text;
  while (next.length > 1 && context.measureText(`${next}…`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}…`;
};

const fetchPlaceLabel = async (latitude: number, longitude: number): Promise<string | null> => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude)
  });
  const res = await fetch(`/api/reverse-geocode?${params.toString()}`);
  if (!res.ok) {
    return null;
  }
  const data: unknown = await res.json();
  if (
    typeof data === "object" &&
    data !== null &&
    "displayName" in data &&
    typeof (data as { displayName?: unknown }).displayName === "string"
  ) {
    const full = (data as { displayName: string }).displayName.trim();
    if (full.length === 0) {
      return null;
    }
    return shortenPlaceNameForDisplay(full);
  }
  return null;
};

const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          resolve(null);
        }, ms);
      })
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
};

/** Resolves coordinates (and a short place name when the geocoder answers quickly). */
export const resolvePhotoStampLocation = async (known?: {
  latitude: number;
  longitude: number;
}): Promise<PhotoStampLocation | undefined> => {
  let latitude = known?.latitude;
  let longitude = known?.longitude;
  if (latitude === undefined || longitude === undefined) {
    const position = await withTimeout(requestCurrentPosition(), 4000);
    if (position === null || !position.ok) {
      return undefined;
    }
    latitude = position.latitude;
    longitude = position.longitude;
  }
  const placeLabel = await withTimeout(fetchPlaceLabel(latitude, longitude), 2500);
  return { latitude, longitude, ...(placeLabel ? { placeLabel } : {}) };
};

/**
 * Burns local date-time and capture location onto a JPEG so the stamp is stored with the upload.
 */
export const stampPhotoTimestamp = async (
  jpegDataUrl: string,
  at: Date = new Date(),
  location?: PhotoStampLocation
): Promise<string> => {
  const image = await loadImageElement(jpegDataUrl);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width === 0 || height === 0) {
    return jpegDataUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) {
    return jpegDataUrl;
  }

  context.drawImage(image, 0, 0, width, height);

  const pad = Math.max(10, Math.round(width * 0.02));
  const fontSize = Math.max(15, Math.round(width * 0.03));
  const lineGap = Math.round(fontSize * 0.35);
  const maxTextWidth = width - pad * 4;
  context.font = `600 ${String(fontSize)}px ui-sans-serif, system-ui, sans-serif`;
  context.textBaseline = "middle";

  const timeLine = formatPhotoTimestamp(at);
  const locationLine =
    location === undefined
      ? null
      : (location.placeLabel?.trim() ?? formatPhotoCoordLabel(location.latitude, location.longitude));
  const lines = [
    fitText(context, timeLine, maxTextWidth),
    ...(locationLine !== null ? [fitText(context, locationLine, maxTextWidth)] : [])
  ];

  const lineHeight = fontSize + lineGap;
  const barHeight = pad + lines.length * lineHeight;
  const barWidth =
    Math.max(...lines.map((line) => context.measureText(line).width)) + pad * 2;
  const x = pad;
  const y = height - barHeight - pad;
  const radius = Math.min(10, pad);

  context.fillStyle = "rgba(0, 0, 0, 0.62)";
  context.beginPath();
  if (typeof context.roundRect === "function") {
    context.roundRect(x, y, barWidth, barHeight, radius);
  } else {
    context.rect(x, y, barWidth, barHeight);
  }
  context.fill();

  context.fillStyle = "#ffffff";
  lines.forEach((line, index) => {
    context.fillText(line, x + pad, y + pad / 2 + fontSize / 2 + index * lineHeight);
  });

  return canvas.toDataURL("image/jpeg", 0.85);
};
