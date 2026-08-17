import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

import type { EnvironmentVariables } from "../../config/environment";
import type {
  CloudinarySignedUploadParams,
  CloudinaryUploadPurpose,
  CloudinaryUploadResult
} from "./cloudinary.types";

const DELIVERY_URL_TTL_SECONDS = 3600;

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly enabled: boolean;
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  public constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {
    this.cloudName = this.configService.get("CLOUDINARY_CLOUD_NAME", { infer: true }).trim();
    this.apiKey = this.configService.get("CLOUDINARY_API_KEY", { infer: true }).trim();
    this.apiSecret = this.configService.get("CLOUDINARY_API_SECRET", { infer: true }).trim();
    this.enabled = this.cloudName.length > 0 && this.apiKey.length > 0 && this.apiSecret.length > 0;

    if (this.enabled) {
      cloudinary.config({
        cloud_name: this.cloudName,
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        secure: true
      });
    }
  }

  public isConfigured(): boolean {
    return this.enabled;
  }

  public requireConfigured(): void {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        "Image upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
      );
    }
  }

  public folderForUser(userId: string, purpose: CloudinaryUploadPurpose): string {
    const segment = purpose === "attendance" ? "attendance" : "outlet-visits";
    return `nestle/${segment}/${userId}`;
  }

  public buildSignedUploadParams(
    userId: string,
    purpose: CloudinaryUploadPurpose
  ): CloudinarySignedUploadParams {
    this.requireConfigured();

    const folder = this.folderForUser(userId, purpose);
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = {
      timestamp,
      folder,
      access_mode: "authenticated"
    };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, this.apiSecret);

    return {
      cloudName: this.cloudName,
      apiKey: this.apiKey,
      timestamp,
      signature,
      folder,
      accessMode: "authenticated"
    };
  }

  public async assertOwnedPublicId(
    publicId: string,
    userId: string,
    purpose: CloudinaryUploadPurpose
  ): Promise<CloudinaryUploadResult> {
    this.requireConfigured();

    const trimmed = publicId.trim();
    const expectedPrefix = `${this.folderForUser(userId, purpose)}/`;
    if (!trimmed.startsWith(expectedPrefix)) {
      throw new BadRequestException("Invalid image reference for this user");
    }

    try {
      const resource = await this.fetchCloudinaryResource(trimmed);
      const secureUrl =
        typeof resource.secure_url === "string" && resource.secure_url.length > 0
          ? resource.secure_url
          : (this.getAuthenticatedDeliveryUrl(trimmed) ?? trimmed);
      return { publicId: trimmed, secureUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Cloudinary error";
      this.logger.warn(`Cloudinary resource lookup failed for ${trimmed}: ${message}`);
      throw new BadRequestException("Image could not be verified. Upload again and retry.");
    }
  }

  public async uploadBuffer(
    buffer: Buffer,
    userId: string,
    purpose: CloudinaryUploadPurpose,
    mimeType: string
  ): Promise<CloudinaryUploadResult> {
    this.requireConfigured();

    const folder = this.folderForUser(userId, purpose);
    const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

    try {
      const result = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: "image",
        access_mode: "authenticated",
        overwrite: false
      });
      if (typeof result.public_id !== "string" || result.public_id.length === 0) {
        throw new Error("Upload returned no public_id");
      }
      const secureUrl =
        typeof result.secure_url === "string" && result.secure_url.length > 0
          ? result.secure_url
          : (this.getAuthenticatedDeliveryUrl(result.public_id) ?? result.public_id);
      return { publicId: result.public_id, secureUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Cloudinary error";
      this.logger.error(`Cloudinary upload failed: ${message}`);
      throw new BadRequestException("Image upload failed. Try a smaller photo or retry.");
    }
  }

  private async fetchCloudinaryResource(publicId: string): Promise<{ secure_url?: string }> {
    const readResource = async (
      type: "authenticated" | "upload"
    ): Promise<{ secure_url?: string }> => {
      const raw: unknown = await cloudinary.api.resource(publicId, {
        resource_type: "image",
        type
      });
      if (typeof raw !== "object" || raw === null) {
        throw new Error("Invalid Cloudinary resource response");
      }
      const record = raw as { secure_url?: unknown };
      if (typeof record.secure_url === "string") {
        return { secure_url: record.secure_url };
      }
      return {};
    };

    try {
      return await readResource("authenticated");
    } catch {
      return readResource("upload");
    }
  }

  public getAuthenticatedDeliveryUrl(publicId: string): string | null {
    if (!this.enabled) {
      return null;
    }
    const trimmed = publicId.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const expiresAt = Math.floor(Date.now() / 1000) + DELIVERY_URL_TTL_SECONDS;
    return cloudinary.url(trimmed, {
      resource_type: "image",
      type: "authenticated",
      sign_url: true,
      secure: true,
      expires_at: expiresAt
    });
  }
}
