import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { StoredImageService } from "../cloudinary/stored-image.service";
import { TrackingRepository } from "./tracking.repository";

const OPS_ROLES = new Set<AuthenticatedUser["role"]>(["admin", "supervisor"]);

@Injectable()
export class TrackingService {
  public constructor(
    @Inject(TrackingRepository) private readonly repository: TrackingRepository,
    @Inject(StoredImageService) private readonly storedImageService: StoredImageService
  ) {}

  public async getCheckInForAdmin(currentUser: AuthenticatedUser, pingId: string) {
    if (!OPS_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor or admin users can view tracking check-ins");
    }

    const ping = await this.repository.findLocationPingByIdWithUserAndSelfie(pingId);
    if (ping === null) {
      throw new NotFoundException("Check-in not found");
    }

    if (ping.user.role !== "promoter") {
      throw new NotFoundException("Check-in not found");
    }

    const selfieDataUrl = this.storedImageService.resolveDataUrl({
      hasImage: ping.hasSelfieVerification,
      mimeType: ping.selfieMimeType,
      image: ping.selfieImage,
      cloudinaryPublicId: ping.selfieCloudinaryPublicId,
      cloudinaryUrl: ping.selfieCloudinaryUrl
    });

    return {
      id: ping.id,
      userId: ping.userId,
      attendanceKind: ping.attendanceKind,
      geofenceId: ping.geofenceId,
      distanceToGeofenceMeters: ping.distanceToGeofenceMeters,
      dwellSecondsAtGeofence: ping.dwellSecondsAtGeofence,
      latitude: ping.latitude,
      longitude: ping.longitude,
      placeLabel: ping.placeLabel,
      recordedAt: ping.recordedAt.toISOString(),
      hasSelfieVerification: ping.hasSelfieVerification,
      selfieDataUrl,
      user: {
        id: ping.user.id,
        fullName: ping.user.fullName,
        phone: ping.user.phone,
        role: ping.user.role
      }
    };
  }
}
