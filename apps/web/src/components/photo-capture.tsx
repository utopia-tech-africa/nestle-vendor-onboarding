"use client";

import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";

import { calmPrimaryButtonClass, calmSecondaryButtonClass } from "@/lib/calm-ui";
import { compressJpegDataUrl } from "@/lib/image/compress-jpeg-data-url";
import { resolvePhotoStampLocation, stampPhotoTimestamp } from "@/lib/image/stamp-photo-timestamp";

export type PhotoCaptureFacingMode = "user" | "environment";

export type PhotoCaptureProps = {
  onPhotoReady: (jpegDataUrl: string) => void;
  disabled?: boolean;
  /** `user` for selfies; `environment` for outlet / shop photos (rear camera on phones). */
  facingMode?: PhotoCaptureFacingMode;
  /** When true, the live camera can flip between front and back. */
  allowCameraSwitch?: boolean;
  description?: string;
  previewAlt?: string;
  openButtonLabel?: string;
  /** When set, the watermark uses this fix instead of requesting GPS again. */
  latitude?: number;
  longitude?: number;
};

const videoConstraints = (mode: PhotoCaptureFacingMode): MediaTrackConstraints => ({
  facingMode: { ideal: mode }
});

/**
 * In-browser camera capture. Emits a JPEG data URL when the user confirms a preview.
 */
export function PhotoCapture({
  onPhotoReady,
  disabled = false,
  facingMode = "user",
  allowCameraSwitch = true,
  description = "Use a private HTTPS connection; your browser will ask for camera access.",
  previewAlt = "Photo preview",
  openButtonLabel = "Open camera",
  latitude,
  longitude
}: PhotoCaptureProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [activeFacing, setActiveFacing] = useState<PhotoCaptureFacingMode>(facingMode);
  const [error, setError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const stampLocationRef = useRef<Awaited<ReturnType<typeof resolvePhotoStampLocation>>>(undefined);

  const stopStream = useCallback((): void => {
    const current = streamRef.current;
    if (current) {
      current.getTracks().forEach((track) => {
        track.stop();
      });
    }
    streamRef.current = null;
    setStream(null);
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || stream === null) {
      return;
    }
    el.srcObject = stream;
    void el.play().catch(() => {
      void 0;
    });
  }, [stream]);

  useEffect(() => {
    if (!cameraOpen) {
      return;
    }
    const known =
      latitude !== undefined && longitude !== undefined ? { latitude, longitude } : undefined;
    void resolvePhotoStampLocation(known).then((location) => {
      stampLocationRef.current = location;
    });
  }, [cameraOpen, latitude, longitude]);

  const startCamera = async (mode: PhotoCaptureFacingMode = activeFacing): Promise<void> => {
    setError(null);
    stopStream();
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints(mode),
        audio: false
      });
      streamRef.current = media;
      setStream(media);
      setActiveFacing(mode);
      setCameraOpen(true);
      setPreviewUrl(null);
    } catch (caught) {
      setCameraOpen(false);
      const message = caught instanceof Error ? caught.message : "Camera unavailable";
      setError(message);
    }
  };

  const switchCamera = (): void => {
    const next: PhotoCaptureFacingMode = activeFacing === "user" ? "environment" : "user";
    setIsSwitching(true);
    void startCamera(next).finally(() => {
      setIsSwitching(false);
    });
  };

  const captureFrame = (): void => {
    const video = videoRef.current;
    if (video === null || video.videoWidth === 0) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (context === null) {
      return;
    }
    context.drawImage(video, 0, 0);
    const rawDataUrl = canvas.toDataURL("image/jpeg", 0.88);
    stopStream();
    setCameraOpen(false);
    setIsCompressing(true);
    setError(null);
    void (async () => {
      try {
        const compressed = await compressJpegDataUrl(rawDataUrl);
        try {
          const known =
            latitude !== undefined && longitude !== undefined
              ? { latitude, longitude }
              : undefined;
          const location = stampLocationRef.current ?? (await resolvePhotoStampLocation(known));
          setPreviewUrl(await stampPhotoTimestamp(compressed, new Date(), location));
        } catch {
          setPreviewUrl(compressed);
        }
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Could not process photo";
        setError(message);
        setPreviewUrl(null);
      } finally {
        setIsCompressing(false);
      }
    })();
  };

  const retakePreview = (): void => {
    setPreviewUrl(null);
    void startCamera();
  };

  const useThisPhoto = (): void => {
    if (previewUrl !== null) {
      onPhotoReady(previewUrl);
    }
  };

  const cancelCamera = (): void => {
    stopStream();
    setCameraOpen(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{description}</p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {!cameraOpen && previewUrl === null ? (
        <button
          type="button"
          className={calmPrimaryButtonClass}
          disabled={disabled}
          onClick={() => {
            void startCamera();
          }}
        >
          {openButtonLabel}
        </button>
      ) : null}
      {isCompressing ? (
        <p className="text-sm text-muted-foreground" role="status">
          Preparing photo…
        </p>
      ) : null}
      {cameraOpen ? (
        <div className="space-y-2">
          <video
            ref={videoRef}
            playsInline
            muted
            className="aspect-video w-full max-w-md rounded-xl border border-border bg-black object-cover"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={calmPrimaryButtonClass}
              disabled={disabled || isCompressing || isSwitching}
              onClick={captureFrame}
            >
              Capture
            </button>
            {allowCameraSwitch ? (
              <button
                type="button"
                className={calmSecondaryButtonClass}
                disabled={disabled || isSwitching}
                onClick={switchCamera}
              >
                {isSwitching
                  ? "Switching…"
                  : activeFacing === "user"
                    ? "Use back camera"
                    : "Use front camera"}
              </button>
            ) : null}
            <button
              type="button"
              className={calmSecondaryButtonClass}
              disabled={disabled || isSwitching}
              onClick={cancelCamera}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {previewUrl !== null ? (
        <div className="space-y-2">
          <img
            src={previewUrl}
            alt={previewAlt}
            className="aspect-video w-full max-w-md rounded-xl border border-border object-cover"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={calmPrimaryButtonClass}
              disabled={disabled}
              onClick={useThisPhoto}
            >
              Use this photo
            </button>
            <button
              type="button"
              className={calmSecondaryButtonClass}
              disabled={disabled}
              onClick={retakePreview}
            >
              Retake
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
