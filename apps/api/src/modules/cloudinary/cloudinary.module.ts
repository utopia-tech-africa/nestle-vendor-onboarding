import { Global, Module } from "@nestjs/common";

import { CloudinaryService } from "./cloudinary.service";
import { StoredImageService } from "./stored-image.service";

@Global()
@Module({
  providers: [CloudinaryService, StoredImageService],
  exports: [CloudinaryService, StoredImageService]
})
export class CloudinaryModule {}
