import type { UpdateLocationDto } from "@/lib/api/generated/model/updateLocationDto";

import { uploadDataUrlToCloudinary } from "./upload-image";

type LocationPayloadInput = {
  latitude: number;
  longitude: number;
  attendanceKind: "clock_in" | "clock_out";
  selfieDataUrl: string;
  token: string | null;
};

/**
 * Prefer Cloudinary public_id; fall back to base64 when upload is unavailable (offline / dev).
 */
export const buildLocationPingPayload = async (
  input: LocationPayloadInput
): Promise<UpdateLocationDto> => {
  const base = {
    latitude: input.latitude,
    longitude: input.longitude,
    attendanceKind: input.attendanceKind
  };

  if (input.token === null || input.token.length === 0) {
    return { ...base, selfieImageBase64: input.selfieDataUrl };
  }

  const uploaded = await uploadDataUrlToCloudinary(input.selfieDataUrl, "attendance", input.token);
  if (uploaded !== null) {
    return { ...base, selfieCloudinaryPublicId: uploaded.publicId };
  }

  return { ...base, selfieImageBase64: input.selfieDataUrl };
};
