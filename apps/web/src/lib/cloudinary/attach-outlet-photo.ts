import type { CreateOutletVisitPayload } from "@/lib/outlet/outlet-api";

import { uploadDataUrlToCloudinary } from "./upload-image";

/**
 * Adds Cloudinary public_id to an outlet visit payload when upload succeeds.
 */
export const attachOutletPhotoToVisitPayload = async (
  payload: CreateOutletVisitPayload,
  photoDataUrl: string | undefined,
  token: string | null
): Promise<CreateOutletVisitPayload> => {
  if (photoDataUrl === undefined) {
    return payload;
  }

  if (token === null || token.length === 0) {
    return { ...payload, outletPhotoBase64: photoDataUrl };
  }

  const uploaded = await uploadDataUrlToCloudinary(photoDataUrl, "outlet_visit", token);
  if (uploaded !== null) {
    const withoutBase64 = { ...payload };
    delete withoutBase64.outletPhotoBase64;
    return { ...withoutBase64, outletPhotoCloudinaryPublicId: uploaded.publicId };
  }

  return { ...payload, outletPhotoBase64: photoDataUrl };
};
