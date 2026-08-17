import type { StoredImageFields } from "./cloudinary.types";

type DeliveryUrlBuilder = (publicId: string) => string | null;

/**
 * Resolves a browser-displayable image URL from Cloudinary refs or legacy DB blobs.
 */
export const resolveStoredImageDataUrl = (
  fields: StoredImageFields,
  buildDeliveryUrl: DeliveryUrlBuilder
): string | null => {
  if (!fields.hasImage) {
    return null;
  }

  const publicId = fields.cloudinaryPublicId?.trim() ?? "";
  if (publicId.length > 0) {
    const signed = buildDeliveryUrl(publicId);
    if (signed !== null) {
      return signed;
    }
  }

  const stored = fields.cloudinaryUrl?.trim() ?? "";
  if (stored.length > 0) {
    return stored;
  }

  if (fields.mimeType !== null && fields.image !== null && fields.image.byteLength > 0) {
    const buffer = Buffer.isBuffer(fields.image) ? fields.image : Buffer.from(fields.image);
    const b64 = buffer.toString("base64");
    return `data:${fields.mimeType};base64,${b64}`;
  }

  return null;
};
