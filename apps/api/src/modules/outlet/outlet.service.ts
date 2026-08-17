import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { haversineDistanceMeters } from "../geofence/haversine";
import { ReverseGeocodeService } from "../me/reverse-geocode.service";
import { resolveOutletPhoto } from "../me/stored-outlet-photo";
import { OpsAlertService } from "../ops-alert/ops-alert.service";
import { MnotifySmsService } from "../sms/mnotify-sms.service";
import type { CreateFieldOutletDto } from "./dto/create-field-outlet.dto";
import type { CreateOutletDto } from "./dto/create-outlet.dto";
import type { UpdateOutletDto } from "./dto/update-outlet.dto";
import { OutletRepository } from "./outlet.repository";

const OUTLET_MANAGER_ROLES = new Set<UserRole>(["admin", "supervisor"]);
const OUTLET_VIEWER_ROLES = new Set<UserRole>(["admin", "supervisor", "client"]);
const FIELD_OUTLET_ROLES = new Set<UserRole>(["promoter"]);

type OutletRow = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  locationArea: string;
  isActive: boolean;
};

@Injectable()
export class OutletService {
  public constructor(
    @Inject(OutletRepository) private readonly outletRepository: OutletRepository,
    @Inject(ReverseGeocodeService) private readonly reverseGeocode: ReverseGeocodeService,
    @Inject(OpsAlertService) private readonly opsAlertService: OpsAlertService,
    @Inject(CloudinaryService) private readonly cloudinaryService: CloudinaryService,
    @Inject(MnotifySmsService) private readonly smsService: MnotifySmsService
  ) {}

  private assertOutletManager(currentUser: AuthenticatedUser): void {
    if (!OUTLET_MANAGER_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor or admin users can manage outlets");
    }
  }

  private assertOutletViewer(currentUser: AuthenticatedUser): void {
    if (!OUTLET_VIEWER_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor, admin, or client can view outlets");
    }
  }

  private assertFieldOutletAccess(currentUser: AuthenticatedUser): void {
    if (!FIELD_OUTLET_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only promoters can list or create outlets in the field app");
    }
  }

  private hasCoordinates(latitude?: number, longitude?: number): boolean {
    return latitude !== undefined && longitude !== undefined;
  }

  private async resolveLocationArea(
    latitude: number,
    longitude: number,
    locationArea?: string
  ): Promise<string> {
    const trimmed = locationArea?.trim();
    if (trimmed !== undefined && trimmed.length >= 2) {
      return trimmed;
    }
    const placeLabel = await this.reverseGeocode.resolvePlaceLabel(latitude, longitude);
    return placeLabel?.trim() ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }

  private async buildAdminLocationFields(dto: CreateOutletDto | UpdateOutletDto): Promise<{
    locationArea: string;
    latitude: number | null;
    longitude: number | null;
  }> {
    const hasCoords = this.hasCoordinates(dto.latitude, dto.longitude);
    const locationText = dto.locationArea?.trim() ?? "";

    if (hasCoords && dto.latitude !== undefined && dto.longitude !== undefined) {
      return {
        locationArea: await this.resolveLocationArea(dto.latitude, dto.longitude, dto.locationArea),
        latitude: dto.latitude,
        longitude: dto.longitude
      };
    }

    if (locationText.length >= 2) {
      return {
        locationArea: locationText,
        latitude: null,
        longitude: null
      };
    }

    throw new BadRequestException(
      "Provide either a map location (latitude and longitude) or a location / area label."
    );
  }

  private profileFieldsFromDto(dto: CreateOutletDto | CreateFieldOutletDto | UpdateOutletDto) {
    return {
      ...(dto.contactPhoneSecondary !== undefined
        ? { contactPhoneSecondary: dto.contactPhoneSecondary.trim() || null }
        : {}),
      ...(dto.vendorRole !== undefined ? { vendorRole: dto.vendorRole } : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
      ...(dto.ageBracket !== undefined ? { ageBracket: dto.ageBracket } : {}),
      ...(dto.employeeCountBracket !== undefined
        ? { employeeCountBracket: dto.employeeCountBracket }
        : {}),
      ...(dto.averageDailySalesBracket !== undefined
        ? { averageDailySalesBracket: dto.averageDailySalesBracket }
        : {}),
      ...(dto.landmark !== undefined ? { landmark: dto.landmark.trim() || null } : {})
    };
  }

  private profileFieldsFromCreate(dto: CreateOutletDto | CreateFieldOutletDto) {
    return {
      contactPhoneSecondary: dto.contactPhoneSecondary?.trim() ?? null,
      vendorRole: dto.vendorRole ?? null,
      gender: dto.gender ?? null,
      ageBracket: dto.ageBracket ?? null,
      employeeCountBracket: dto.employeeCountBracket ?? null,
      averageDailySalesBracket: dto.averageDailySalesBracket ?? null,
      landmark: dto.landmark?.trim() ?? null
    };
  }

  /**
   * Ensures the visit GPS is near the outlet pin, or backfills the outlet pin on first visit.
   */
  public async assertVisitLocationAndSyncOutlet(
    outlet: OutletRow,
    visitLatitude: number,
    visitLongitude: number,
    maxDistanceMeters: number
  ): Promise<void> {
    if (outlet.latitude !== null && outlet.longitude !== null) {
      const distanceMeters = haversineDistanceMeters(
        visitLatitude,
        visitLongitude,
        outlet.latitude,
        outlet.longitude
      );
      if (distanceMeters > maxDistanceMeters) {
        throw new BadRequestException(
          `You appear to be ${String(Math.round(distanceMeters))} meters from this outlet's registered location (max ${String(maxDistanceMeters)} m). Move closer to the shop and try again.`
        );
      }
      return;
    }

    const locationArea = await this.resolveLocationArea(visitLatitude, visitLongitude);
    await this.outletRepository.update(outlet.id, {
      locationArea,
      latitude: visitLatitude,
      longitude: visitLongitude
    });
  }

  public listForAdmin(currentUser: AuthenticatedUser) {
    this.assertOutletViewer(currentUser);
    return this.outletRepository.findAll();
  }

  public async createForAdmin(currentUser: AuthenticatedUser, dto: CreateOutletDto) {
    this.assertOutletManager(currentUser);
    const location = await this.buildAdminLocationFields(dto);
    return this.outletRepository.create({
      name: dto.name.trim(),
      category: dto.category.trim(),
      distributorName: (dto.distributorName ?? "N/A").trim(),
      locationArea: location.locationArea,
      district: dto.district?.trim() ?? null,
      regionId: dto.regionId?.trim() ?? null,
      yearsInBusiness: dto.yearsInBusiness ?? null,
      latitude: location.latitude,
      longitude: location.longitude,
      contactName: dto.contactName.trim(),
      contactPhone: dto.contactPhone.trim(),
      contactEmail: dto.contactEmail?.trim().toLowerCase() ?? null,
      ...this.profileFieldsFromCreate(dto),
      isActive: dto.isActive ?? true
    });
  }

  public listForField(currentUser: AuthenticatedUser) {
    this.assertFieldOutletAccess(currentUser);
    return this.outletRepository.findAllActive();
  }

  public async findActiveForField(currentUser: AuthenticatedUser, id: string): Promise<OutletRow> {
    this.assertFieldOutletAccess(currentUser);
    const outlet = await this.outletRepository.findById(id);
    if (!outlet?.isActive) {
      throw new NotFoundException("Active outlet not found");
    }
    return outlet;
  }

  public async createForField(currentUser: AuthenticatedUser, dto: CreateFieldOutletDto) {
    this.assertFieldOutletAccess(currentUser);
    const locationArea = await this.resolveLocationArea(
      dto.latitude,
      dto.longitude,
      dto.locationArea
    );

    const promoterRegionId = await this.outletRepository.findUserRegionId(currentUser.id);
    const regionId = dto.regionId?.trim() || promoterRegionId;

    const onboardingPhotos: {
      category: "vendor" | "shop" | "product_display" | "shelf_visibility" | "branding" | "competitor";
      cloudinaryPublicId: string | null;
      cloudinaryUrl: string | null;
      mimeType: string | null;
      imageBytes: Uint8Array<ArrayBuffer> | null;
    }[] = [];
    for (const photo of dto.photos ?? []) {
      const resolved = await resolveOutletPhoto(this.cloudinaryService, currentUser.id, {
        ...(photo.cloudinaryPublicId !== undefined
          ? { outletPhotoCloudinaryPublicId: photo.cloudinaryPublicId }
          : {}),
        ...(photo.photoBase64 !== undefined ? { outletPhotoBase64: photo.photoBase64 } : {})
      });
      if (resolved?.hasPhoto) {
        onboardingPhotos.push({
          category: photo.category,
          cloudinaryPublicId: resolved.cloudinaryPublicId,
          cloudinaryUrl: resolved.cloudinaryUrl,
          mimeType: resolved.mimeType,
          imageBytes: resolved.image
        });
      }
    }

    const created = await this.outletRepository.create({
      name: dto.name.trim(),
      category: dto.category.trim(),
      distributorName: (dto.distributorName ?? "N/A").trim(),
      locationArea,
      district: dto.district?.trim() ?? null,
      regionId: regionId ?? null,
      yearsInBusiness: dto.yearsInBusiness ?? null,
      latitude: dto.latitude,
      longitude: dto.longitude,
      contactName: dto.contactName.trim(),
      contactPhone: dto.contactPhone.trim(),
      contactEmail: dto.contactEmail?.trim().toLowerCase() ?? null,
      ...this.profileFieldsFromCreate(dto),
      isActive: true,
      ...(onboardingPhotos.length > 0 ? { onboardingPhotos } : {})
    });

    void this.opsAlertService.notifyNewVendor({
      outletId: created.id,
      name: created.name,
      createdByUserId: currentUser.id
    });

    void this.smsService.trySendSms({
      phone: created.contactPhone ?? dto.contactPhone,
      message: `Hello ${dto.contactName.trim()}, you have been onboarded as a Nestlé Ghana koko vendor. Your vendor ID is ${created.vendorCode}.`
    });

    return created;
  }

  public listActiveRegionsForField(currentUser: AuthenticatedUser) {
    this.assertFieldOutletAccess(currentUser);
    return this.outletRepository.listActiveRegions();
  }

  public async updateForAdmin(currentUser: AuthenticatedUser, id: string, dto: UpdateOutletDto) {
    this.assertOutletManager(currentUser);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }
    const existing = await this.outletRepository.findById(id);
    if (existing === null) {
      throw new NotFoundException("Outlet not found");
    }

    const locationInput: CreateOutletDto = {
      name: dto.name ?? existing.name,
      category: dto.category ?? existing.category,
      distributorName: dto.distributorName ?? existing.distributorName,
      locationArea: dto.locationArea ?? existing.locationArea,
      contactName: dto.contactName ?? existing.contactName ?? "Unknown",
      contactPhone: dto.contactPhone ?? existing.contactPhone ?? "0000000000",
      isActive: dto.isActive ?? existing.isActive,
      ...(dto.latitude !== undefined
        ? { latitude: dto.latitude }
        : existing.latitude !== null
          ? { latitude: existing.latitude }
          : {}),
      ...(dto.longitude !== undefined
        ? { longitude: dto.longitude }
        : existing.longitude !== null
          ? { longitude: existing.longitude }
          : {}),
      ...(dto.contactEmail !== undefined
        ? { contactEmail: dto.contactEmail }
        : existing.contactEmail !== null
          ? { contactEmail: existing.contactEmail }
          : {})
    };

    const location =
      dto.latitude !== undefined || dto.longitude !== undefined || dto.locationArea !== undefined
        ? await this.buildAdminLocationFields(locationInput)
        : null;

    return this.outletRepository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
      ...(dto.distributorName !== undefined ? { distributorName: dto.distributorName.trim() } : {}),
      ...(dto.district !== undefined ? { district: dto.district.trim() || null } : {}),
      ...(dto.regionId !== undefined ? { regionId: dto.regionId.trim() || null } : {}),
      ...(dto.yearsInBusiness !== undefined ? { yearsInBusiness: dto.yearsInBusiness } : {}),
      ...(location !== null
        ? {
            locationArea: location.locationArea,
            latitude: location.latitude,
            longitude: location.longitude
          }
        : dto.locationArea !== undefined
          ? { locationArea: dto.locationArea.trim() }
          : {}),
      ...(dto.contactName !== undefined ? { contactName: dto.contactName.trim() } : {}),
      ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone.trim() } : {}),
      ...(dto.contactEmail !== undefined
        ? { contactEmail: dto.contactEmail.trim().toLowerCase() }
        : {}),
      ...this.profileFieldsFromDto(dto),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
    });
  }

  public listVisitsForField(currentUser: AuthenticatedUser, limit: number) {
    const take = Math.min(100, Math.max(1, limit));
    return this.outletRepository.listVisitsForUser(currentUser.id, take);
  }

  public listVisitsForAdmin(
    currentUser: AuthenticatedUser,
    params: {
      limit: number;
      skip?: number;
      outletId?: string;
      userId?: string;
      from?: string;
      to?: string;
    }
  ) {
    this.assertOutletViewer(currentUser);
    const take = Math.min(200, Math.max(1, params.limit));
    const skip = Math.max(0, params.skip ?? 0);
    const fromDate = params.from !== undefined ? new Date(params.from) : undefined;
    const toDate = params.to !== undefined ? new Date(params.to) : undefined;
    if (fromDate !== undefined && Number.isNaN(fromDate.getTime())) {
      throw new BadRequestException("from must be a valid ISO datetime");
    }
    if (toDate !== undefined && Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("to must be a valid ISO datetime");
    }
    return this.outletRepository.listVisitsForAdmin({
      take,
      ...(skip > 0 ? { skip } : {}),
      ...(params.outletId !== undefined ? { outletId: params.outletId } : {}),
      ...(params.userId !== undefined ? { userId: params.userId } : {}),
      ...(fromDate !== undefined ? { from: fromDate } : {}),
      ...(toDate !== undefined ? { to: toDate } : {})
    });
  }
}
