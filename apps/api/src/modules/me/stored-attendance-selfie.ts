import { BadRequestException } from "@nestjs/common";

import type { CloudinaryService } from "../cloudinary/cloudinary.service";
import { parseSelfieBase64 } from "./selfie-image.util";

export type ResolvedAttendanceSelfie = {
  mimeType: string | null;
  image: Buffer | null;
  cloudinaryPublicId: string | null;
  cloudinaryUrl: string | null;
  hasVerification: boolean;
};

const emptySelfie = (): ResolvedAttendanceSelfie => ({
  mimeType: null,
  image: null,
  cloudinaryPublicId: null,
  cloudinaryUrl: null,
  hasVerification: false
});

export const resolveAttendanceSelfie = async (
  cloudinaryService: CloudinaryService,
  userId: string,
  options: {
    autoClockOut: boolean;
    selfieCloudinaryPublicId?: string;
    selfieImageBase64?: string;
  }
): Promise<ResolvedAttendanceSelfie> => {
  if (options.autoClockOut) {
    return emptySelfie();
  }

  const publicId = options.selfieCloudinaryPublicId?.trim() ?? "";
  if (publicId.length > 0) {
    if (!cloudinaryService.isConfigured()) {
      throw new BadRequestException("Image upload is not configured on the server");
    }
    const verified = await cloudinaryService.assertOwnedPublicId(publicId, userId, "attendance");
    return {
      mimeType: null,
      image: null,
      cloudinaryPublicId: verified.publicId,
      cloudinaryUrl: verified.secureUrl,
      hasVerification: true
    };
  }

  const base64 = options.selfieImageBase64?.trim() ?? "";
  if (base64.length === 0) {
    throw new BadRequestException("Selfie image is required for check-in");
  }

  const parsed = parseSelfieBase64(base64);
  if (cloudinaryService.isConfigured()) {
    const uploaded = await cloudinaryService.uploadBuffer(
      parsed.buffer,
      userId,
      "attendance",
      parsed.mimeType
    );
    return {
      mimeType: null,
      image: null,
      cloudinaryPublicId: uploaded.publicId,
      cloudinaryUrl: uploaded.secureUrl,
      hasVerification: true
    };
  }

  return {
    mimeType: parsed.mimeType,
    image: parsed.buffer,
    cloudinaryPublicId: null,
    cloudinaryUrl: null,
    hasVerification: true
  };
};
