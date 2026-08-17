"use client";

import { type ReactElement, useCallback, useMemo, useState } from "react";

import { GeofenceMapPicker } from "@/components/geofence-map-picker";
import { requestCurrentPosition } from "@/lib/geolocation/request-current-position";

const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const placeSearchInputClass =
  "h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 text-sm leading-snug text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const placeToolbarButtonClass =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-card px-3 text-xs font-semibold text-card-foreground shadow-sm transition-colors hover:border-primary/60 hover:bg-muted " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "active:bg-muted disabled:pointer-events-none disabled:opacity-50 sm:text-sm";

/** Small circle on the map — pin only, not a geofence radius. */
const OUTLET_PIN_RADIUS_METERS = 12;

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

type GeocodeHit = {
  lat: number;
  lon: number;
  displayName: string;
};

export type OutletLocationEditorProps = {
  latitude: string;
  longitude: string;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  fieldIdPrefix: string;
  /** When the user picks a search result and the parent label is empty, fill it with a short place name. */
  onSuggestLocationArea?: (shortLabel: string) => void;
};

export const OutletLocationEditor = ({
  latitude,
  longitude,
  onLatitudeChange,
  onLongitudeChange,
  fieldIdPrefix,
  onSuggestLocationArea
}: OutletLocationEditorProps): ReactElement => {
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeHits, setPlaceHits] = useState<GeocodeHit[]>([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const mapLat = useMemo(() => {
    const n = Number(latitude);
    return Number.isFinite(n) ? n : null;
  }, [latitude]);

  const mapLng = useMemo(() => {
    const n = Number(longitude);
    return Number.isFinite(n) ? n : null;
  }, [longitude]);

  const onMapPick = useCallback(
    (lat: number, lng: number) => {
      onLatitudeChange(lat.toFixed(6));
      onLongitudeChange(lng.toFixed(6));
    },
    [onLatitudeChange, onLongitudeChange]
  );

  const searchPlace = useCallback(async (): Promise<void> => {
    const q = placeQuery.trim();
    setPlaceError(null);
    setPlaceHits([]);
    if (q.length < 2) {
      setPlaceError("Type at least 2 characters.");
      return;
    }
    setPlaceLoading(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data: unknown = await res.json();
      if (!res.ok) {
        let err = "Search failed.";
        if (isJsonObject(data) && typeof data.error === "string") {
          err = data.error;
        }
        setPlaceError(err);
        return;
      }
      if (!isJsonObject(data) || !("results" in data) || !Array.isArray(data.results)) {
        setPlaceError("Unexpected response.");
        return;
      }
      const raw = data.results;
      const hits: GeocodeHit[] = [];
      for (const item of raw) {
        if (
          item !== null &&
          typeof item === "object" &&
          "lat" in item &&
          "lon" in item &&
          "displayName" in item
        ) {
          const lat = Number((item as { lat: unknown }).lat);
          const lon = Number((item as { lon: unknown }).lon);
          const displayName = String((item as { displayName: unknown }).displayName);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            hits.push({ lat, lon, displayName });
          }
        }
      }
      setPlaceHits(hits);
      if (hits.length === 0) {
        setPlaceError("No places found. Try a different search.");
      }
    } catch {
      setPlaceError("Could not search. Check your connection and try again.");
    } finally {
      setPlaceLoading(false);
    }
  }, [placeQuery]);

  const applyHit = useCallback(
    (hit: GeocodeHit): void => {
      onLatitudeChange(hit.lat.toFixed(6));
      onLongitudeChange(hit.lon.toFixed(6));
      setPlaceHits([]);
      setPlaceError(null);
      if (onSuggestLocationArea) {
        const short = hit.displayName.split(",").at(0)?.trim() ?? hit.displayName;
        onSuggestLocationArea(short);
      }
    },
    [onLatitudeChange, onLongitudeChange, onSuggestLocationArea]
  );

  const useMyLocation = useCallback((): void => {
    setPlaceError(null);
    void (async () => {
      const pos = await requestCurrentPosition();
      if (pos.ok) {
        onLatitudeChange(pos.latitude.toFixed(6));
        onLongitudeChange(pos.longitude.toFixed(6));
      } else {
        setPlaceError(pos.message);
      }
    })();
  }, [onLatitudeChange, onLongitudeChange]);

  return (
    <div className="space-y-4 md:col-span-2">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Outlet location</p>
        <p id={`${fieldIdPrefix}-place-hint`} className="mt-0.5 text-xs text-muted-foreground">
          Search for the shop, use your location, or click the map. This pin is what promoters see
          and must be near when they check in.
        </p>
        <div className="mt-2 flex w-full min-w-0 flex-row flex-nowrap items-center gap-2">
          <input
            id={`${fieldIdPrefix}-place`}
            className={placeSearchInputClass}
            value={placeQuery}
            onChange={(e) => {
              setPlaceQuery(e.target.value);
            }}
            placeholder="e.g. Westlands Nairobi, Kenya"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void searchPlace();
              }
            }}
            aria-describedby={`${fieldIdPrefix}-place-hint`}
          />
          <button
            type="button"
            className={placeToolbarButtonClass}
            disabled={placeLoading}
            onClick={() => {
              void searchPlace();
            }}
          >
            {placeLoading ? "Searching…" : "Search place"}
          </button>
          <button type="button" className={placeToolbarButtonClass} onClick={useMyLocation}>
            My location
          </button>
        </div>
        {placeError ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {placeError}
          </p>
        ) : null}
        {placeHits.length > 0 ? (
          <ul
            className="mt-2 max-h-40 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card text-sm shadow-sm"
            role="listbox"
          >
            {placeHits.map((hit) => (
              <li key={`${String(hit.lat)}-${String(hit.lon)}-${hit.displayName.slice(0, 24)}`}>
                <button
                  type="button"
                  className="w-full cursor-pointer px-3 py-2.5 text-left text-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  onClick={() => {
                    applyHit(hit);
                  }}
                >
                  <span className="font-medium">{hit.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <GeofenceMapPicker
        latitude={mapLat}
        longitude={mapLng}
        radiusMeters={OUTLET_PIN_RADIUS_METERS}
        onLocationPick={onMapPick}
        otherZones={[]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`${fieldIdPrefix}-lat`}
          >
            Latitude
          </label>
          <input
            id={`${fieldIdPrefix}-lat`}
            className={inputClass}
            value={latitude}
            readOnly
            tabIndex={-1}
            aria-readonly
          />
        </div>
        <div>
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`${fieldIdPrefix}-lng`}
          >
            Longitude
          </label>
          <input
            id={`${fieldIdPrefix}-lng`}
            className={inputClass}
            value={longitude}
            readOnly
            tabIndex={-1}
            aria-readonly
          />
        </div>
      </div>
    </div>
  );
};
