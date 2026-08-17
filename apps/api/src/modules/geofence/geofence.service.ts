import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import type { CreateGeofenceDto } from "./dto/create-geofence.dto";
import type { UpdateGeofenceDto } from "./dto/update-geofence.dto";
import { GeofenceRepository } from "./geofence.repository";
import { haversineDistanceMeters } from "./haversine";

const GEOFENCE_MANAGER_ROLES = new Set<UserRole>(["admin", "supervisor"]);

export type GeofenceWatchZone = {
  geofenceId: string;
  label: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
};

const toWatchZone = (fence: {
  id: string;
  label: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
}): GeofenceWatchZone => ({
  geofenceId: fence.id,
  label: fence.label,
  centerLatitude: fence.centerLatitude,
  centerLongitude: fence.centerLongitude,
  radiusMeters: fence.radiusMeters
});

type WorkAreaFence = {
  id: string;
  label: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
};

type NearestGeofenceMatch = {
  geofenceId: string;
  label: string;
  distanceMeters: number;
  radiusMeters: number;
};

const isInsideWorkAreaFence = (
  latitude: number,
  longitude: number,
  fence: WorkAreaFence
): boolean =>
  haversineDistanceMeters(latitude, longitude, fence.centerLatitude, fence.centerLongitude) <=
  fence.radiusMeters;

const findNearestAmongWorkAreaFences = (
  latitude: number,
  longitude: number,
  fences: readonly WorkAreaFence[]
): NearestGeofenceMatch | null => {
  let nearest: NearestGeofenceMatch | null = null;
  for (const fence of fences) {
    const distanceMeters = haversineDistanceMeters(
      latitude,
      longitude,
      fence.centerLatitude,
      fence.centerLongitude
    );
    if (nearest === null || distanceMeters < nearest.distanceMeters) {
      nearest = {
        geofenceId: fence.id,
        label: fence.label,
        distanceMeters,
        radiusMeters: fence.radiusMeters
      };
    }
  }
  return nearest;
};

@Injectable()
export class GeofenceService {
  public constructor(@Inject(GeofenceRepository) private readonly repository: GeofenceRepository) {}

  /** Matches PRD: `/admin/*` is supervisor + admin. */
  public requireSupervisorOrAdmin(currentUser: AuthenticatedUser): void {
    if (!GEOFENCE_MANAGER_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor or admin users can manage geofences");
    }
  }

  /**
   * When at least one geofence is active, sign-in must include coordinates inside any active circle.
   * When none are active, location is not required.
   */
  public async assertLoginAllowed(latitude?: number, longitude?: number): Promise<void> {
    const active = await this.repository.findActive();
    if (active.length === 0) {
      return;
    }

    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException(
        "Current location is required to sign in because a work area is configured. Enable location for this site and try again."
      );
    }

    const inside = active.some((fence) => isInsideWorkAreaFence(latitude, longitude, fence));

    if (!inside) {
      throw new ForbiddenException(
        "Sign-in is only allowed from within the authorized work area. Move inside the designated zone or contact your administrator."
      );
    }
  }

  /**
   * Promoter sign-in: must be inside an assigned work area when one is set,
   * otherwise inside any active work area when geofencing is configured.
   */
  public async assertLoginAllowedForPromoter(
    userId: string,
    latitude?: number,
    longitude?: number
  ): Promise<void> {
    const { fences, assignedInactive } = await this.resolveWorkAreaFencesForPromoter(userId);
    if (assignedInactive) {
      throw new ForbiddenException(
        "Your assigned work area is inactive. Contact your supervisor."
      );
    }
    if (fences.length === 0) {
      return;
    }

    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException(
        "Current location is required to sign in because a work area is configured. Enable location for this site and try again."
      );
    }

    const inside = fences.some((fence) => isInsideWorkAreaFence(latitude, longitude, fence));
    if (!inside) {
      throw new ForbiddenException(
        "Sign-in is only allowed from within your assigned work area. Move inside the designated zone or contact your supervisor."
      );
    }
  }

  /**
   * Promoter clock-in: same work-area rules as sign-in.
   */
  public async assertCheckInAllowedForPromoter(
    userId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    const { fences, assignedInactive } = await this.resolveWorkAreaFencesForPromoter(userId);
    if (assignedInactive) {
      throw new BadRequestException(
        "Check-in rejected: your assigned work area is inactive. Contact your supervisor."
      );
    }
    if (fences.length === 0) {
      return;
    }

    const inside = fences.some((fence) => isInsideWorkAreaFence(latitude, longitude, fence));
    if (!inside) {
      throw new BadRequestException(
        "Check-in rejected: you must be inside your assigned work area."
      );
    }
  }

  /**
   * Active work areas a promoter may clock in from.
   * Assigned zones take precedence; otherwise all active geofences (until assigned).
   */
  public async resolveWorkAreaFencesForPromoter(userId: string): Promise<{
    fences: WorkAreaFence[];
    assignedInactive: boolean;
  }> {
    const assignedActive = await this.repository.findActiveAssignedToPromoter(userId);
    if (assignedActive.length > 0) {
      return { fences: assignedActive, assignedInactive: false };
    }

    const assignedCount = await this.repository.countAssignedToPromoter(userId);
    if (assignedCount > 0) {
      return { fences: [], assignedInactive: true };
    }

    const active = await this.repository.findActive();
    return { fences: active, assignedInactive: false };
  }

  /**
   * Nearest work-area geofence for attendance recording.
   */
  public async findNearestWorkAreaGeofenceForPromoter(
    userId: string,
    latitude: number,
    longitude: number
  ): Promise<NearestGeofenceMatch | null> {
    const { fences } = await this.resolveWorkAreaFencesForPromoter(userId);
    return findNearestAmongWorkAreaFences(latitude, longitude, fences);
  }

  /**
   * Returns nearest active geofence (if any) and great-circle distance from the point.
   */
  public async findNearestActiveGeofence(
    latitude: number,
    longitude: number
  ): Promise<NearestGeofenceMatch | null> {
    const active = await this.repository.findActive();
    return findNearestAmongWorkAreaFences(latitude, longitude, active);
  }

  /**
   * Work-area circles used to detect leaving the zone while clocked in.
   * Prefers the geofence from today's clock-in when it is still an allowed zone.
   */
  public async resolveWatchZonesForPromoter(
    userId: string,
    clockInGeofenceId: string | null
  ): Promise<GeofenceWatchZone[]> {
    const { fences } = await this.resolveWorkAreaFencesForPromoter(userId);
    if (clockInGeofenceId !== null) {
      const matched = fences.find((fence) => fence.id === clockInGeofenceId);
      if (matched !== undefined) {
        return [toWatchZone(matched)];
      }
    }
    return fences.map(toWatchZone);
  }

  public isInsideAnyWatchZone(
    latitude: number,
    longitude: number,
    zones: readonly GeofenceWatchZone[]
  ): boolean {
    return zones.some((zone) =>
      isInsideWorkAreaFence(latitude, longitude, {
        id: zone.geofenceId,
        label: zone.label,
        centerLatitude: zone.centerLatitude,
        centerLongitude: zone.centerLongitude,
        radiusMeters: zone.radiusMeters
      })
    );
  }

  public listForAdmin(currentUser: AuthenticatedUser) {
    this.requireSupervisorOrAdmin(currentUser);
    return this.repository.findAll();
  }

  public async createForAdmin(currentUser: AuthenticatedUser, dto: CreateGeofenceDto) {
    this.requireSupervisorOrAdmin(currentUser);
    return this.repository.create({
      label: dto.label,
      centerLatitude: dto.centerLatitude,
      centerLongitude: dto.centerLongitude,
      radiusMeters: dto.radiusMeters,
      isActive: dto.isActive ?? true
    });
  }

  public async updateForAdmin(currentUser: AuthenticatedUser, id: string, dto: UpdateGeofenceDto) {
    this.requireSupervisorOrAdmin(currentUser);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException("Geofence not found");
    }
    return this.repository.update(id, dto);
  }

  public async deleteForAdmin(currentUser: AuthenticatedUser, id: string) {
    this.requireSupervisorOrAdmin(currentUser);
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException("Geofence not found");
    }
    await this.repository.deleteById(id);
    return { ok: true as const };
  }
}
