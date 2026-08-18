const PHOTO_STAMP_TIMEZONE = "Africa/Accra";

const stampFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: PHOTO_STAMP_TIMEZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error("Could not load image for timestamp stamp"));
    };
    image.src = src;
  });

export const formatPhotoTimestamp = (at: Date = new Date()): string => stampFormatter.format(at);

/**
 * Burns a local (Africa/Accra) date-time onto a JPEG so the stamp is stored with the upload.
 */
export const stampPhotoTimestamp = async (
  jpegDataUrl: string,
  at: Date = new Date()
): Promise<string> => {
  const image = await loadImageElement(jpegDataUrl);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width === 0 || height === 0) {
    return jpegDataUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) {
    return jpegDataUrl;
  }

  context.drawImage(image, 0, 0, width, height);

  const label = formatPhotoTimestamp(at);
  const pad = Math.max(10, Math.round(width * 0.02));
  const fontSize = Math.max(16, Math.round(width * 0.032));
  context.font = `600 ${String(fontSize)}px ui-sans-serif, system-ui, sans-serif`;
  context.textBaseline = "middle";
  const textWidth = context.measureText(label).width;
  const barHeight = fontSize + pad;
  const barWidth = textWidth + pad * 2;
  const x = pad;
  const y = height - barHeight - pad;
  const radius = Math.min(10, barHeight / 2);

  context.fillStyle = "rgba(0, 0, 0, 0.62)";
  context.beginPath();
  if (typeof context.roundRect === "function") {
    context.roundRect(x, y, barWidth, barHeight, radius);
  } else {
    context.rect(x, y, barWidth, barHeight);
  }
  context.fill();

  context.fillStyle = "#ffffff";
  context.fillText(label, x + pad, y + barHeight / 2);

  return canvas.toDataURL("image/jpeg", 0.85);
};
