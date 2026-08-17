"use client";

import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";

import { compressJpegDataUrl } from "@/lib/image/compress-jpeg-data-url";
import { calmPrimaryButtonClass, calmSecondaryButtonClass } from "@/lib/calm-ui";

export type PhotoCaptureProps = {
  onPhotoReady: (jpegDataUrl: string) => void;
  disabled?: boolean;
  /** `user` for selfies; `environment` for outlet / shop photos (rear camera on phones). */
  facingMode?: "user" | "environment";
  description?: string;
  previewAlt?: string;
  openButtonLabel?: string;
};

/**
 * In-browser camera capture. Emits a JPEG data URL when the user confirms a preview.
 */
export function PhotoCapture({
  onPhotoReady,
  disabled = false,
  facingMode = "user",
  description = "Use a private HTTPS connection; your browser will ask for camera access.",
  previewAlt = "Photo preview",
  openButtonLabel = "Open camera"
}: PhotoCaptureProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const stopStream = useCallback((): void => {
    setStream((prev) => {
      if (prev) {
        prev.getTracks().forEach((track) => {
          track.stop();
        });
      }
      return null;
    });
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

  const startCamera = async (): Promise<void> => {
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false
      });
      setStream(media);
      setCameraOpen(true);
      setPreviewUrl(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Camera unavailable";
      setError(message);
    }
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
        setPreviewUrl(compressed);
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
              disabled={disabled || isCompressing}
              onClick={captureFrame}
            >
              Capture
            </button>
            <button
              type="button"
              className={calmSecondaryButtonClass}
              disabled={disabled}
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
