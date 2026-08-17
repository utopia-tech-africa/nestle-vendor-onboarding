"use client";

import { type ReactElement } from "react";

import { PhotoCapture, type PhotoCaptureProps } from "@/components/photo-capture";

export type SelfieCaptureProps = Pick<PhotoCaptureProps, "onPhotoReady" | "disabled">;

/**
 * Front-camera capture for attendance verification. Emits a JPEG data URL on “Use this photo”.
 */
export function SelfieCapture({
  onPhotoReady,
  disabled = false
}: SelfieCaptureProps): ReactElement {
  return (
    <PhotoCapture
      onPhotoReady={onPhotoReady}
      disabled={disabled}
      facingMode="user"
      description="Take a clear selfie (face visible). This confirms you are present for the check-in. Use a private HTTPS connection; your browser will ask for camera access."
      previewAlt="Selfie preview"
      openButtonLabel="Open camera"
    />
  );
}
