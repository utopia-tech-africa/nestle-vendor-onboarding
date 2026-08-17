import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DateTime } from "luxon";

import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import type { AttendanceKind } from "../../generated/prisma/client";
import type { EnvironmentVariables } from "../../config/environment";
import { type GeofenceWatchZone, GeofenceService } from "../geofence/geofence.service";
import { OutletRepository } from "../outlet/outlet.repository";
import { OutletService } from "../outlet/outlet.service";
import { PrismaService } from "../prisma/prisma.service";
import { TrackingStreamService } from "../tracking/tracking-stream.service";
import type { CreateOutletVisitDto } from "./dto/create-outlet-visit.dto";
import type { UpdateLocationDto } from "./dto/update-location.dto";
import type { UpdateMeDto } from "./dto/update-me.dto";
import { type LocationPingHistoryRow, MeRepository } from "./me.repository";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { OpsAlertService } from "../ops-alert/ops-alert.service";
import { ReverseGeocodeService } from "./reverse-geocode.service";
import { resolveAttendanceSelfie } from "./stored-attendance-selfie";
import { resolveOutletPhoto } from "./stored-outlet-photo";

const toProfilePatch = (
  value: UpdateMeDto
): Partial<{
  fullName: string;
  gender: "male" | "female" | "other";
  regionId: string;
}> => {
  return {
    ...(value.fullName !== undefined ? { fullName: value.fullName } : {}),
    ...(value.gender !== undefined ? { gender: value.gender } : {}),
    ...(value.regionId !== undefined ? { regionId: value.regionId } : {})
  };
};

@Injectable()
export class MeService {
  public constructor(
    @Inject(MeRepository) private readonly meRepository: MeRepository,
    @Inject(ReverseGeocodeService) private readonly reverseGeocode: ReverseGeocodeService,
    @Inject(GeofenceService) private readonly geofenceService: GeofenceService,
    @Inject(OutletService) private readonly outletService: OutletService,
    @Inject(OutletRepository) private readonly outletRepository: OutletRepository,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TrackingStreamService) private readonly trackingStream: TrackingStreamService,
    @Inject(ConfigService)
    private readonly configService: ConfigService<EnvironmentVariables, true>,
    @Inject(CloudinaryService) private readonly cloudinaryService: CloudinaryService,
    @Inject(OpsAlertService) private readonly opsAlertService: OpsAlertService
  ) {}

  public getCloudinaryUploadSignature(
    currentUser: AuthenticatedUser,
    purpose: "attendance" | "outlet_visit"
  ) {
    return this.cloudinaryService.buildSignedUploadParams(currentUser.id, purpose);
  }

  private ensureFieldVisitRole(role: AuthenticatedUser["role"]): void {
    if (role !== "promoter") {
      throw new BadRequestException("Only promoters can submit outlet visits");
    }
  }

  private getAttendanceTimezone(): string {
    return this.configService.get("ATTENDANCE_TIMEZONE", { infer: true });
  }

  private toMeProfileResponse(
    profile: {
      id: string;
      fullName: string;
      phone: string;
      role: string;
      gender: string | null;
      regionId: string | null;
      region: { name: string } | null;
    } | null
  ) {
    if (!profile) {
      throw new NotFoundException("User profile not found");
    }
    const { region, ...rest } = profile;
    return {
      ...rest,
      regionName: region?.name ?? null
    };
  }

  public async getCurrentUser(currentUser: AuthenticatedUser) {
    const profile = await this.meRepository.getProfile(currentUser.id);
    return this.toMeProfileResponse(profile);
  }

  /**
   * Field promoters: local calendar day (ATTENDANCE_TIMEZONE), first clock-in gate, and segment suggestion.
   */
  public async getFieldAttendance(currentUser: AuthenticatedUser) {
    const tz = this.getAttendanceTimezone();
    if (!DateTime.now().setZone(tz).isValid) {
      throw new BadRequestException(`Invalid ATTENDANCE_TIMEZONE: ${tz}`);
    }

    if (currentUser.role !== "promoter") {
      return {
        applicable: false as const,
        timezone: tz,
        localDate: "",
        needsDailyClockIn: false,
        needsRecurringClockIn: false,
        suggestedNextAttendanceKind: "clock_in" as const
      };
    }

    const { localDate, startUtc, endUtcExclusive } = this.getAttendanceLocalDayBounds(tz);
    const clockInsToday = await this.meRepository.countAttendanceKindInWindow(
      currentUser.id,
      startUtc,
      endUtcExclusive,
      "clock_in"
    );
    const needsDailyClockIn = clockInsToday === 0;
    const latestToday = await this.meRepository.findLatestPingInRecordedAtWindow(
      currentUser.id,
      startUtc,
      endUtcExclusive
    );
    const recheckMinutes = this.configService.get("ATTENDANCE_RECHECK_MINUTES", { infer: true });
    const lastClockInIsStale =
      latestToday !== null &&
      latestToday.attendanceKind === "clock_in" &&
      Date.now() - latestToday.recordedAt.getTime() >= recheckMinutes * 60 * 1000;
    const needsRecurringClockIn = !needsDailyClockIn && lastClockInIsStale;
    const suggestedNextAttendanceKind: "clock_in" | "clock_out" = needsRecurringClockIn
      ? "clock_in"
      : latestToday === null
        ? "clock_in"
        : latestToday.attendanceKind === "clock_in"
          ? "clock_out"
          : "clock_in";

    const autoClockOutEnabled = this.configService.get("ATTENDANCE_AUTO_CLOCK_OUT_ENABLED", {
      infer: true
    });
    const graceSeconds = this.configService.get("ATTENDANCE_AUTO_CLOCK_OUT_GRACE_SECONDS", {
      infer: true
    });
    let geofenceWatch: {
      enabled: boolean;
      graceSeconds: number;
      zones: GeofenceWatchZone[];
    } = { enabled: false, graceSeconds, zones: [] };

    if (autoClockOutEnabled && suggestedNextAttendanceKind === "clock_out") {
      const zones = await this.resolveGeofenceWatchZones(currentUser.id, startUtc, endUtcExclusive);
      geofenceWatch = {
        enabled: zones.length > 0,
        graceSeconds,
        zones
      };
    }

    return {
      applicable: true as const,
      timezone: tz,
      localDate,
      needsDailyClockIn,
      needsRecurringClockIn,
      suggestedNextAttendanceKind,
      geofenceWatch
    };
  }

  private async resolveGeofenceWatchZones(
    userId: string,
    windowStart: Date,
    windowEndExclusive: Date
  ): Promise<GeofenceWatchZone[]> {
    const clockIn = await this.meRepository.findLatestClockInInRecordedAtWindow(
      userId,
      windowStart,
      windowEndExclusive
    );
    return this.geofenceService.resolveWatchZonesForPromoter(userId, clockIn?.geofenceId ?? null);
  }

  private getAttendanceLocalDayBounds(tz: string): {
    localDate: string;
    startUtc: Date;
    endUtcExclusive: Date;
  } {
    const nowLocal = DateTime.now().setZone(tz);
    const dayStart = nowLocal.startOf("day");
    const dayEndExclusive = dayStart.plus({ days: 1 });
    return {
      localDate: dayStart.toFormat("yyyy-MM-dd"),
      startUtc: dayStart.toUTC().toJSDate(),
      endUtcExclusive: dayEndExclusive.toUTC().toJSDate()
    };
  }

  private async assertVisitSegmentOrThrow(
    currentUser: AuthenticatedUser,
    requestedKind: AttendanceKind,
    windowStart: Date,
    windowEndExclusive: Date
  ): Promise<void> {
    if (currentUser.role !== "promoter") {
      return;
    }
    const latestToday = await this.meRepository.findLatestPingInRecordedAtWindow(
      currentUser.id,
      windowStart,
      windowEndExclusive
    );
    if (latestToday === null) {
      if (requestedKind !== "clock_in") {
        throw new BadRequestException("Start your day with a clock-in.");
      }
      return;
    }
    if (latestToday.attendanceKind === "clock_in") {
      if (requestedKind === "clock_in") {
        const recheckMinutes = this.configService.get("ATTENDANCE_RECHECK_MINUTES", { infer: true });
        const ageMs = Date.now() - latestToday.recordedAt.getTime();
        if (ageMs >= recheckMinutes * 60 * 1000) {
          return;
        }
        throw new BadRequestException("Clock out before you can clock in again.");
      }
      if (requestedKind !== "clock_out") {
        throw new BadRequestException("Clock out before you can clock in again.");
      }
      return;
    }
    if (requestedKind !== "clock_in") {
      throw new BadRequestException("Clock in to start your next visit.");
    }
  }

  public async updateCurrentUser(currentUser: AuthenticatedUser, payload: UpdateMeDto) {
    if (Object.keys(payload).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }

    const patch = toProfilePatch(payload);
    const updated = await this.meRepository.updateProfile(currentUser.id, patch);
    return this.toMeProfileResponse(updated);
  }

  public async updateLocation(currentUser: AuthenticatedUser, payload: UpdateLocationDto) {
    const tz = this.getAttendanceTimezone();
    const { startUtc, endUtcExclusive } = this.getAttendanceLocalDayBounds(tz);
    const attendanceKind: AttendanceKind = payload.attendanceKind ?? "clock_in";
    const autoClockOut = payload.autoClockOut === true;
    await this.assertVisitSegmentOrThrow(currentUser, attendanceKind, startUtc, endUtcExclusive);

    if (autoClockOut) {
      if (attendanceKind !== "clock_out") {
        throw new BadRequestException("autoClockOut requires attendanceKind clock_out");
      }
      if (!this.configService.get("ATTENDANCE_AUTO_CLOCK_OUT_ENABLED", { infer: true })) {
        throw new BadRequestException("Automatic clock-out is disabled");
      }
      if (currentUser.role !== "promoter") {
        throw new BadRequestException("Automatic clock-out applies to promoters only");
      }
      const watchZones = await this.resolveGeofenceWatchZones(
        currentUser.id,
        startUtc,
        endUtcExclusive
      );
      if (watchZones.length === 0) {
        throw new BadRequestException("No work area is configured for automatic clock-out");
      }
      if (
        this.geofenceService.isInsideAnyWatchZone(payload.latitude, payload.longitude, watchZones)
      ) {
        throw new BadRequestException(
          "You are still inside the work area. Move outside the radius to clock out automatically."
        );
      }
    }

    const selfie = await resolveAttendanceSelfie(this.cloudinaryService, currentUser.id, {
      autoClockOut,
      ...(payload.selfieCloudinaryPublicId !== undefined
        ? { selfieCloudinaryPublicId: payload.selfieCloudinaryPublicId }
        : {}),
      ...(payload.selfieImageBase64 !== undefined
        ? { selfieImageBase64: payload.selfieImageBase64 }
        : {})
    });
    const enforceDistance = this.configService.get("ATTENDANCE_ENFORCE_GEOFENCE_DISTANCE", {
      infer: true
    });
    if (enforceDistance && attendanceKind !== "clock_out") {
      if (currentUser.role === "promoter") {
        await this.geofenceService.assertCheckInAllowedForPromoter(
          currentUser.id,
          payload.latitude,
          payload.longitude
        );
      } else {
        await this.geofenceService.assertLoginAllowed(payload.latitude, payload.longitude);
      }
    }

    const nearest =
      currentUser.role === "promoter"
        ? await this.geofenceService.findNearestWorkAreaGeofenceForPromoter(
            currentUser.id,
            payload.latitude,
            payload.longitude
          )
        : await this.geofenceService.findNearestActiveGeofence(payload.latitude, payload.longitude);

    const placeLabel = await this.reverseGeocode.resolvePlaceLabel(
      payload.latitude,
      payload.longitude
    );
    const previous = await this.meRepository.findLatestLocationPingByUser(currentUser.id);
    const dwellSecondsAtGeofence =
      previous?.geofenceId !== null &&
      previous?.geofenceId !== undefined &&
      nearest !== null &&
      previous.geofenceId === nearest.geofenceId
        ? Math.max(0, Math.floor((Date.now() - previous.recordedAt.getTime()) / 1000))
        : null;
    const saved = await this.meRepository.addLocation(
      currentUser.id,
      payload.latitude,
      payload.longitude,
      placeLabel,
      {
        mimeType: selfie.mimeType,
        image: selfie.image,
        cloudinaryPublicId: selfie.cloudinaryPublicId,
        cloudinaryUrl: selfie.cloudinaryUrl,
        hasVerification: selfie.hasVerification
      },
      attendanceKind,
      nearest?.geofenceId ?? null,
      nearest !== null ? Number(nearest.distanceMeters.toFixed(2)) : null,
      dwellSecondsAtGeofence
    );
    const trackingProfile = await this.meRepository.getTrackingProfile(currentUser.id);
    if (trackingProfile !== null) {
      this.trackingStream.publish({
        userId: trackingProfile.id,
        fullName: trackingProfile.fullName,
        phone: trackingProfile.phone,
        role: trackingProfile.role,
        regionId: trackingProfile.regionId,
        regionName: trackingProfile.region?.name ?? null,
        locationPingId: saved.id,
        attendanceKind: saved.attendanceKind,
        geofenceId: saved.geofenceId,
        distanceToGeofenceMeters: saved.distanceToGeofenceMeters,
        dwellSecondsAtGeofence: saved.dwellSecondsAtGeofence,
        latitude: saved.latitude,
        longitude: saved.longitude,
        placeLabel: saved.placeLabel,
        hasSelfieVerification: saved.hasSelfieVerification,
        recordedAt: saved.recordedAt.toISOString()
      });
    }
    return saved;
  }

  public async listLocationHistory(
    currentUser: AuthenticatedUser,
    limit: number
  ): Promise<LocationPingHistoryRow[]> {
    const take = Math.min(100, Math.max(1, limit));
    const rows: LocationPingHistoryRow[] = await this.meRepository.listLocationPingsByUser(
      currentUser.id,
      take
    );
    return rows;
  }

  public async createOutletVisit(currentUser: AuthenticatedUser, payload: CreateOutletVisitDto) {
    this.ensureFieldVisitRole(currentUser.role);
    const outlet = await this.outletService.findActiveForField(currentUser, payload.outletId);

    const maxDistanceMeters = this.configService.get("OUTLET_VISIT_MAX_DISTANCE_METERS", {
      infer: true
    });
    await this.outletService.assertVisitLocationAndSyncOutlet(
      outlet,
      payload.latitude,
      payload.longitude,
      maxDistanceMeters
    );

    const resolvedPhoto = await resolveOutletPhoto(this.cloudinaryService, currentUser.id, {
      ...(payload.outletPhotoCloudinaryPublicId !== undefined
        ? { outletPhotoCloudinaryPublicId: payload.outletPhotoCloudinaryPublicId }
        : {}),
      ...(payload.outletPhotoBase64 !== undefined
        ? { outletPhotoBase64: payload.outletPhotoBase64 }
        : {})
    });

    const photoInputs = payload.photos ?? [];
    const resolvedPhotos: {
      category: "vendor" | "shop" | "product_display" | "shelf_visibility" | "branding" | "competitor";
      cloudinaryPublicId: string | null;
      cloudinaryUrl: string | null;
      mimeType: string | null;
      imageBytes: Uint8Array<ArrayBuffer> | null;
    }[] = [];

    for (const photo of photoInputs) {
      const resolved = await resolveOutletPhoto(this.cloudinaryService, currentUser.id, {
        ...(photo.cloudinaryPublicId !== undefined
          ? { outletPhotoCloudinaryPublicId: photo.cloudinaryPublicId }
          : {}),
        ...(photo.photoBase64 !== undefined ? { outletPhotoBase64: photo.photoBase64 } : {})
      });
      if (resolved?.hasPhoto) {
        resolvedPhotos.push({
          category: photo.category,
          cloudinaryPublicId: resolved.cloudinaryPublicId,
          cloudinaryUrl: resolved.cloudinaryUrl,
          mimeType: resolved.mimeType,
          imageBytes: resolved.image
        });
      }
    }

    const hasAnyPhoto = (resolvedPhoto?.hasPhoto ?? false) || resolvedPhotos.length > 0;

    const visibilityFlags = [
      payload.nestleProductAvailable === true,
      payload.posMaterialsPresent === true,
      payload.promotionalMaterialsPresent === true,
      payload.outOfStock !== true,
      (payload.shelfVisibilityNotes?.trim().length ?? 0) > 0,
      (payload.productPlacementNotes?.trim().length ?? 0) > 0
    ];
    const visibilityScore =
      payload.nestleProductAvailable !== undefined ||
      payload.posMaterialsPresent !== undefined ||
      payload.promotionalMaterialsPresent !== undefined ||
      payload.outOfStock !== undefined ||
      payload.shelfVisibilityNotes !== undefined ||
      payload.productPlacementNotes !== undefined
        ? Math.round((visibilityFlags.filter(Boolean).length / visibilityFlags.length) * 100)
        : null;

    const incompleteReasons: string[] = [];
    if (payload.questionnaire === undefined) {
      incompleteReasons.push("questionnaire");
    }
    if (payload.nestleProductAvailable === undefined && payload.outOfStock === undefined) {
      incompleteReasons.push("visibility");
    }

    const visitData = {
      outletId: outlet.id,
      userId: currentUser.id,
      latitude: payload.latitude,
      longitude: payload.longitude,
      outletPhotoMimeType: resolvedPhoto?.mimeType ?? null,
      outletPhotoImage: resolvedPhoto?.image ?? null,
      outletPhotoCloudinaryPublicId: resolvedPhoto?.cloudinaryPublicId ?? null,
      outletPhotoCloudinaryUrl: resolvedPhoto?.cloudinaryUrl ?? null,
      hasOutletPhoto: hasAnyPhoto,
      stockAvailabilityNotes: payload.stockAvailabilityNotes?.trim() ?? null,
      consumerEngagementNotes: payload.consumerEngagementNotes?.trim() ?? null,
      footfallEstimated: payload.footfallEstimated ?? null,
      footfallPeakPeriods: payload.footfallPeakPeriods?.trim() ?? null,
      trafficCategory: payload.trafficCategory ?? null,
      footfallManualCount: payload.footfallManualCount ?? null,
      nestleProductAvailable: payload.nestleProductAvailable ?? null,
      nestleProductsJson:
        payload.nestleProducts !== undefined && payload.nestleProducts.length > 0
          ? JSON.stringify(payload.nestleProducts)
          : null,
      productPlacementNotes: payload.productPlacementNotes?.trim() ?? null,
      shelfVisibilityNotes: payload.shelfVisibilityNotes?.trim() ?? null,
      posMaterialsPresent: payload.posMaterialsPresent ?? null,
      promotionalMaterialsPresent: payload.promotionalMaterialsPresent ?? null,
      stockLevelNotes: payload.stockLevelNotes?.trim() ?? null,
      outOfStock: payload.outOfStock ?? null,
      visibilityScore,
      isComplete: incompleteReasons.length === 0,
      incompleteReasons: incompleteReasons.length > 0 ? incompleteReasons.join(",") : null,
      photos: resolvedPhotos,
      competitors: (payload.competitors ?? []).map((c) => ({
        brandName: c.brandName.trim(),
        brandNameOther: c.brandNameOther?.trim() ?? null,
        productsJson:
          c.products !== undefined && c.products.length > 0 ? JSON.stringify(c.products) : null,
        pricingNotes: c.pricingNotes?.trim() ?? null,
        promotionsNotes: c.promotionsNotes?.trim() ?? null,
        discountsNotes: c.discountsNotes?.trim() ?? null,
        newLaunchesNotes: c.newLaunchesNotes?.trim() ?? null,
        displayQualityNotes: c.displayQualityNotes?.trim() ?? null,
        marketObservations: c.marketObservations?.trim() ?? null
      }))
    };

    const transactionTimeoutMs = this.configService.get("PRISMA_TRANSACTION_TIMEOUT_MS", {
      infer: true
    });

    return this.prisma.$transaction(
      async (tx) => {
        const visit = await this.outletRepository.createVisit(visitData, tx);

        if (payload.questionnaire !== undefined) {
          await tx.questionnaireResponse.create({
            data: {
              questionnaireId: payload.questionnaire.questionnaireId,
              visitId: visit.id,
              answers: {
                create: payload.questionnaire.answers.map((a) => ({
                  questionId: a.questionId,
                  valueText: a.valueText?.trim() ?? null
                }))
              }
            }
          });
        }

        if (!visitData.isComplete) {
          void this.opsAlertService.create({
            kind: "incomplete_visit",
            severity: "warning",
            title: "Incomplete vendor visit",
            message: `Visit at vendor ${outlet.id} missing: ${visitData.incompleteReasons ?? "sections"}`,
            metaJson: JSON.stringify({
              visitId: visit.id,
              outletId: outlet.id,
              userId: currentUser.id,
              incompleteReasons: visitData.incompleteReasons
            })
          });
        }

        return { visit };
      },
      { maxWait: transactionTimeoutMs, timeout: transactionTimeoutMs }
    );
  }
}
