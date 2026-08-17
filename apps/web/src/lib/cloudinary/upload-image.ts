import { apiRequest } from "@/lib/api/http-client";
import { ApiError } from "@/lib/api/problem-details";

export type CloudinaryUploadPurpose = "attendance" | "outlet_visit";

type CloudinarySignedUploadParams = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  accessMode: "authenticated";
};

type CloudinaryUploadResponse = {
  public_id: string;
  secure_url: string;
};

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error("Could not read photo data");
  }
  return response.blob();
};

const fetchUploadSignature = async (
  purpose: CloudinaryUploadPurpose,
  token: string
): Promise<CloudinarySignedUploadParams> =>
  apiRequest<CloudinarySignedUploadParams>(
    `/me/cloudinary-upload-signature?purpose=${encodeURIComponent(purpose)}`,
    { token }
  );

/**
 * Uploads a JPEG data URL to Cloudinary using a server-signed request.
 * Returns null when Cloudinary is not configured (503) so callers can fall back to base64.
 */
export const uploadDataUrlToCloudinary = async (
  dataUrl: string,
  purpose: CloudinaryUploadPurpose,
  token: string
): Promise<{ publicId: string; secureUrl: string } | null> => {
  let signature: CloudinarySignedUploadParams;
  try {
    signature = await fetchUploadSignature(purpose, token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) {
      return null;
    }
    throw error;
  }

  const blob = await dataUrlToBlob(dataUrl);
  const form = new FormData();
  form.append("file", blob, "photo.jpg");
  form.append("api_key", signature.apiKey);
  form.append("timestamp", String(signature.timestamp));
  form.append("signature", signature.signature);
  form.append("folder", signature.folder);
  form.append("access_mode", signature.accessMode);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
    { method: "POST", body: form }
  );

  if (!uploadResponse.ok) {
    const text = await uploadResponse.text().catch(() => "");
    throw new Error(
      text.length > 0 ? `Photo upload failed: ${text}` : "Photo upload failed. Try again."
    );
  }

  const json = (await uploadResponse.json()) as CloudinaryUploadResponse;
  if (typeof json.public_id !== "string" || json.public_id.length === 0) {
    throw new Error("Photo upload returned an invalid reference");
  }
  return {
    publicId: json.public_id,
    secureUrl: typeof json.secure_url === "string" ? json.secure_url : json.public_id
  };
};
