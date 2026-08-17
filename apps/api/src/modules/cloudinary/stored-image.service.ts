import { Inject, Injectable } from "@nestjs/common";

import { resolveStoredImageDataUrl } from "./cloudinary-image-url.util";
import { CloudinaryService } from "./cloudinary.service";
import type { StoredImageFields } from "./cloudinary.types";

@Injectable()
export class StoredImageService {
  public constructor(
    @Inject(CloudinaryService) private readonly cloudinaryService: CloudinaryService
  ) {}

  public resolveDataUrl(fields: StoredImageFields): string | null {
    return resolveStoredImageDataUrl(fields, (publicId) =>
      this.cloudinaryService.getAuthenticatedDeliveryUrl(publicId)
    );
  }
}
