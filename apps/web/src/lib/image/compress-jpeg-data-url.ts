/** Matches API attendance/outlet photo max decoded size (5 MiB). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const DEFAULT_MAX_EDGE_PX = 1280;
const DEFAULT_JPEG_QUALITY = 0.75;

const scaleToMaxEdge = (
  width: number,
  height: number,
  maxEdgePx: number
): { width: number; height: number } => {
  if (width <= maxEdgePx && height <= maxEdgePx) {
    return { width, height };
  }
  const scale = maxEdgePx / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
};

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error("Could not load image for compression"));
    };
    image.src = src;
  });

const estimateDecodedBytes = (jpegDataUrl: string): number => {
  const commaIdx = jpegDataUrl.indexOf(",");
  const base64 = commaIdx === -1 ? jpegDataUrl : jpegDataUrl.slice(commaIdx + 1);
  return Math.floor((base64.length * 3) / 4);
};

export type CompressJpegDataUrlOptions = {
  maxEdgePx?: number;
  quality?: number;
};

/**
 * Downscales and re-encodes a JPEG data URL for upload (clock-in selfies, outlet photos).
 */
export const compressJpegDataUrl = async (
  dataUrl: string,
  options?: CompressJpegDataUrlOptions
): Promise<string> => {
  const maxEdgePx = options?.maxEdgePx ?? DEFAULT_MAX_EDGE_PX;
  const quality = options?.quality ?? DEFAULT_JPEG_QUALITY;

  const image = await loadImageElement(dataUrl);
  const { width, height } = scaleToMaxEdge(image.naturalWidth, image.naturalHeight, maxEdgePx);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("Canvas is not available");
  }
  context.drawImage(image, 0, 0, width, height);

  let result = canvas.toDataURL("image/jpeg", quality);
  let decodedBytes = estimateDecodedBytes(result);

  if (decodedBytes <= MAX_IMAGE_BYTES) {
    return result;
  }

  for (const retryQuality of [0.65, 0.55, 0.45] as const) {
    result = canvas.toDataURL("image/jpeg", retryQuality);
    decodedBytes = estimateDecodedBytes(result);
    if (decodedBytes <= MAX_IMAGE_BYTES) {
      return result;
    }
  }

  throw new Error("Photo is still too large after compression. Move closer or retake.");
};
