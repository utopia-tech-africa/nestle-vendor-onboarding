import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import { ConfigService } from "@nestjs/config";
import { DateTime } from "luxon";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import type { EnvironmentVariables } from "../../config/environment";
import type { VisitPhotoCategory } from "../../generated/prisma/client";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { StoredImageService } from "../cloudinary/stored-image.service";
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

const hidePromoterContact = (role: UserRole): boolean => role === "client";

type OutletRow = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  locationArea: string;
  isActive: boolean;
};

type OnboardingPhotoRow = {
  id: string;
  category: VisitPhotoCategory;
  cloudinaryPublicId: string | null;
  cloudinaryUrl: string | null;
  mimeType: string | null;
};

type OutletWithOnboardingPhotos = {
  onboardingPhotos: OnboardingPhotoRow[];
};

@Injectable()
export class OutletService {
  public constructor(
    @Inject(OutletRepository) private readonly outletRepository: OutletRepository,
    @Inject(ReverseGeocodeService) private readonly reverseGeocode: ReverseGeocodeService,
    @Inject(OpsAlertService) private readonly opsAlertService: OpsAlertService,
    @Inject(CloudinaryService) private readonly cloudinaryService: CloudinaryService,
    @Inject(StoredImageService) private readonly storedImageService: StoredImageService,
    @Inject(MnotifySmsService) private readonly smsService: MnotifySmsService,
    @Inject(ConfigService) private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {}

  private mapOnboardingPhotos(
    photos: OnboardingPhotoRow[],
    bytesById: Map<string, { mimeType: string | null; imageBytes: Uint8Array | Buffer | null }>
  ) {
    return photos.flatMap((photo) => {
      const stored = bytesById.get(photo.id);
      const url = this.storedImageService.resolveDataUrl({
        hasImage: Boolean(
          photo.cloudinaryPublicId?.trim() ||
            photo.cloudinaryUrl?.trim() ||
            (stored?.imageBytes != null && stored.imageBytes.byteLength > 0)
        ),
        mimeType: stored?.mimeType ?? photo.mimeType,
        image: stored?.imageBytes ?? null,
        cloudinaryPublicId: photo.cloudinaryPublicId,
        cloudinaryUrl: photo.cloudinaryUrl
      });
      if (url === null) {
        return [];
      }
      return [{ id: photo.id, category: photo.category, cloudinaryUrl: url }];
    });
  }

  private async decorateOutlets<T extends OutletWithOnboardingPhotos>(outlets: T[]) {
    const missingIds = outlets.flatMap((outlet) =>
      outlet.onboardingPhotos
        .filter((photo) => {
          const publicId = photo.cloudinaryPublicId?.trim() ?? "";
          const url = photo.cloudinaryUrl?.trim() ?? "";
          return publicId.length === 0 && url.length === 0;
        })
        .map((photo) => photo.id)
    );
    const byteRows = await this.outletRepository.findOnboardingPhotoBytes(missingIds);
    const bytesById = new Map(
      byteRows.map((row) => [row.id, { mimeType: row.mimeType, imageBytes: row.imageBytes }])
    );
    return outlets.map(({ onboardingPhotos, ...outlet }) => ({
      ...outlet,
      onboardingPhotos: this.mapOnboardingPhotos(onboardingPhotos, bytesById)
    }));
  }

  private async decorateOutlet<T extends OutletWithOnboardingPhotos>(outlet: T) {
    const [decorated] = await this.decorateOutlets([outlet]);
    if (decorated === undefined) {
      throw new Error("Outlet photo mapping failed");
    }
    return decorated;
  }

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

  public async listForAdmin(
    currentUser: AuthenticatedUser,
    params: {
      limit: number;
      skip?: number;
      search?: string;
      regionId?: string;
      category?: string;
      isActive?: boolean;
      createdByUserId?: string;
      unassigned?: boolean;
    }
  ) {
    this.assertOutletViewer(currentUser);
    const take = Math.min(100, Math.max(1, params.limit));
    const skip = Math.max(0, params.skip ?? 0);
    const { items, total } = await this.outletRepository.findPage({
      take,
      skip,
      ...(params.search !== undefined ? { search: params.search } : {}),
      ...(params.regionId !== undefined ? { regionId: params.regionId } : {}),
      ...(params.category !== undefined ? { category: params.category } : {}),
      ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
      ...(params.createdByUserId !== undefined ? { createdByUserId: params.createdByUserId } : {}),
      ...(params.unassigned === true ? { unassigned: true } : {})
    });
    const decorated = await this.decorateOutlets(items);
    return {
      items: hidePromoterContact(currentUser.role)
        ? decorated.map((outlet) =>
            outlet.createdBy == null ? outlet : { ...outlet, createdBy: { ...outlet.createdBy, phone: "" } }
          )
        : decorated,
      total
    };
  }

  public listOutletOptionsForViewer(currentUser: AuthenticatedUser) {
    this.assertOutletViewer(currentUser);
    return this.outletRepository.listFilterOptions();
  }

  public async listPromotersForViewer(currentUser: AuthenticatedUser) {
    this.assertOutletViewer(currentUser);
    const rows = await this.outletRepository.listPromoters();
    if (!hidePromoterContact(currentUser.role)) {
      return rows;
    }
    return rows.map((row) => ({ ...row, phone: "" }));
  }

  public async createForAdmin(currentUser: AuthenticatedUser, dto: CreateOutletDto) {
    this.assertOutletManager(currentUser);
    const location = await this.buildAdminLocationFields(dto);
    const created = await this.outletRepository.create({
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
    return this.decorateOutlet(created);
  }

  public async listForField(currentUser: AuthenticatedUser) {
    this.assertFieldOutletAccess(currentUser);
    const rows = await this.outletRepository.findAllActive();
    return this.decorateOutlets(rows);
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
      createdByUserId: currentUser.id,
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

    return this.decorateOutlet(created);
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

    const updated = await this.outletRepository.update(id, {
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
    return this.decorateOutlet(updated);
  }

  public listVisitsForField(currentUser: AuthenticatedUser, limit: number) {
    this.assertFieldOutletAccess(currentUser);
    const take = Math.min(100, Math.max(1, limit));
    const tz = this.configService.get("ATTENDANCE_TIMEZONE", { infer: true });
    const dayStart = DateTime.now().setZone(tz).startOf("day");
    if (!dayStart.isValid) {
      throw new BadRequestException(`Invalid ATTENDANCE_TIMEZONE: ${tz}`);
    }
    const from = dayStart.toUTC().toJSDate();
    const to = dayStart.plus({ days: 1 }).toUTC().toJSDate();
    return this.outletRepository.listVisitsForUser(currentUser.id, take, from, to);
  }

  public async listVisitsForAdmin(
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
    const page = await this.outletRepository.listVisitsForAdmin({
      take,
      ...(skip > 0 ? { skip } : {}),
      ...(params.outletId !== undefined ? { outletId: params.outletId } : {}),
      ...(params.userId !== undefined ? { userId: params.userId } : {}),
      ...(fromDate !== undefined ? { from: fromDate } : {}),
      ...(toDate !== undefined ? { to: toDate } : {})
    });
    if (!hidePromoterContact(currentUser.role)) {
      return page;
    }
    return {
      ...page,
      items: page.items.map((visit) => ({
        ...visit,
        user: visit.user == null ? visit.user : { ...visit.user, phone: "" }
      }))
    };
  }
}
