export type CloudinaryUploadPurpose = "attendance" | "outlet_visit";

export type CloudinarySignedUploadParams = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  accessMode: "authenticated";
};

export type CloudinaryUploadResult = {
  publicId: string;
  secureUrl: string;
};

export type StoredImageFields = {
  hasImage: boolean;
  mimeType: string | null;
  image: Uint8Array | Buffer | null;
  cloudinaryPublicId: string | null;
  cloudinaryUrl: string | null;
};
