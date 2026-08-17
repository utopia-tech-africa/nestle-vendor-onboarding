import { BadRequestException } from "@nestjs/common";

import type { CloudinaryService } from "../cloudinary/cloudinary.service";
import { parseOutletPhotoBase64 } from "./outlet-photo.util";

export type ResolvedOutletPhoto = {
  mimeType: string | null;
  image: Uint8Array<ArrayBuffer> | null;
  cloudinaryPublicId: string | null;
  cloudinaryUrl: string | null;
  hasPhoto: boolean;
};

export const resolveOutletPhoto = async (
  cloudinaryService: CloudinaryService,
  userId: string,
  options: {
    outletPhotoCloudinaryPublicId?: string;
    outletPhotoBase64?: string;
  }
): Promise<ResolvedOutletPhoto | null> => {
  const publicId = options.outletPhotoCloudinaryPublicId?.trim() ?? "";
  if (publicId.length > 0) {
    if (!cloudinaryService.isConfigured()) {
      throw new BadRequestException("Image upload is not configured on the server");
    }
    const verified = await cloudinaryService.assertOwnedPublicId(publicId, userId, "outlet_visit");
    return {
      mimeType: null,
      image: null,
      cloudinaryPublicId: verified.publicId,
      cloudinaryUrl: verified.secureUrl,
      hasPhoto: true
    };
  }

  if (options.outletPhotoBase64 === undefined) {
    return null;
  }

  const parsed = parseOutletPhotoBase64(options.outletPhotoBase64);
  if (cloudinaryService.isConfigured()) {
    const uploaded = await cloudinaryService.uploadBuffer(
      parsed.buffer,
      userId,
      "outlet_visit",
      parsed.mimeType
    );
    return {
      mimeType: null,
      image: null,
      cloudinaryPublicId: uploaded.publicId,
      cloudinaryUrl: uploaded.secureUrl,
      hasPhoto: true
    };
  }

  const bytes = new Uint8Array(parsed.buffer.length);
  bytes.set(parsed.buffer);
  return {
    mimeType: parsed.mimeType,
    image: bytes,
    cloudinaryPublicId: null,
    cloudinaryUrl: null,
    hasPhoto: true
  };
};
