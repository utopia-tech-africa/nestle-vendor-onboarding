import { Inject, Injectable } from "@nestjs/common";

import type {
  AgeBracket,
  AverageDailySalesBracket,
  EmployeeCountBracket,
  Gender,
  Prisma,
  TrafficCategory,
  VendorRole,
  VisitPhotoCategory
} from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { formatVendorCode } from "../region/region-code.util";

const visitListSelect = {
  id: true,
  outletId: true,
  userId: true,
  latitude: true,
  longitude: true,
  hasOutletPhoto: true,
  stockAvailabilityNotes: true,
  consumerEngagementNotes: true,
  footfallEstimated: true,
  footfallPeakPeriods: true,
  trafficCategory: true,
  footfallManualCount: true,
  nestleProductAvailable: true,
  nestleProductsJson: true,
  productPlacementNotes: true,
  shelfVisibilityNotes: true,
  posMaterialsPresent: true,
  promotionalMaterialsPresent: true,
  stockLevelNotes: true,
  outOfStock: true,
  visibilityScore: true,
  isComplete: true,
  incompleteReasons: true,
  checkedInAt: true,
  photos: {
    select: {
      id: true,
      category: true,
      cloudinaryPublicId: true,
      cloudinaryUrl: true,
      createdAt: true
    }
  },
  competitorObservations: {
    select: {
      id: true,
      brandName: true,
      brandNameOther: true,
      productsJson: true,
      pricingNotes: true,
      promotionsNotes: true,
      discountsNotes: true,
      newLaunchesNotes: true,
      displayQualityNotes: true,
      marketObservations: true
    }
  },
  questionnaireResponses: {
    select: {
      id: true,
      questionnaireId: true,
      submittedAt: true,
      answers: {
        select: {
          questionId: true,
          valueText: true,
          question: { select: { prompt: true, type: true } }
        }
      }
    }
  }
} satisfies Prisma.OutletVisitSelect;

const outletSelect = {
  id: true,
  vendorCode: true,
  name: true,
  vendorTypeGroup: true,
  category: true,
  distributorName: true,
  locationArea: true,
  district: true,
  regionId: true,
  yearsInBusiness: true,
  latitude: true,
  longitude: true,
  contactName: true,
  contactPhone: true,
  contactPhoneSecondary: true,
  contactEmail: true,
  vendorRole: true,
  gender: true,
  ageBracket: true,
  employeeCountBracket: true,
  averageDailySalesBracket: true,
  landmark: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdByUserId: true,
  region: { select: { id: true, name: true, slug: true } },
  createdBy: { select: { id: true, fullName: true, phone: true, role: true } },
  onboardingPhotos: {
    select: {
      id: true,
      category: true,
      cloudinaryPublicId: true,
      cloudinaryUrl: true,
      mimeType: true
    },
    orderBy: { createdAt: "asc" }
  }
} satisfies Prisma.OutletSelect;

type OutletWriteData = {
  name: string;
  vendorTypeGroup?: string | null;
  category: string;
  distributorName: string;
  locationArea: string;
  district?: string | null;
  regionId?: string | null;
  yearsInBusiness?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactPhoneSecondary?: string | null;
  contactEmail: string | null;
  vendorRole?: VendorRole | null;
  gender?: Gender | null;
  ageBracket?: AgeBracket | null;
  employeeCountBracket?: EmployeeCountBracket | null;
  averageDailySalesBracket?: AverageDailySalesBracket | null;
  landmark?: string | null;
  isActive: boolean;
  createdByUserId?: string | null;
  onboardingPhotos?: {
    category: VisitPhotoCategory;
    cloudinaryPublicId: string | null;
    cloudinaryUrl: string | null;
    mimeType: string | null;
    imageBytes: Uint8Array<ArrayBuffer> | null;
  }[];
};

@Injectable()
export class OutletRepository {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private db(tx?: Prisma.TransactionClient): Prisma.TransactionClient {
    return tx ?? this.prisma;
  }

  public findAllActive() {
    return this.prisma.outlet.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }, { locationArea: "asc" }],
      select: outletSelect
    });
  }

  public listFilterOptions() {
    return this.prisma.outlet.findMany({
      orderBy: [{ name: "asc" }, { vendorCode: "asc" }],
      select: {
        id: true,
        vendorCode: true,
        name: true,
        contactName: true,
        contactPhone: true,
        district: true
      }
    });
  }

  public async findPage(params: {
    take: number;
    skip: number;
    search?: string;
    regionId?: string;
    category?: string;
    isActive?: boolean;
    createdByUserId?: string;
    unassigned?: boolean;
    includePersonalContactSearch?: boolean;
  }) {
    const where = this.buildListWhere(params);
    const [items, total] = await Promise.all([
      this.prisma.outlet.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: params.take,
        skip: params.skip,
        select: outletSelect
      }),
      this.prisma.outlet.count({ where })
    ]);
    return { items, total };
  }

  private buildListWhere(params: {
    search?: string;
    regionId?: string;
    category?: string;
    isActive?: boolean;
    createdByUserId?: string;
    unassigned?: boolean;
    includePersonalContactSearch?: boolean;
  }): Prisma.OutletWhereInput {
    const where: Prisma.OutletWhereInput = {};
    if (params.regionId !== undefined) {
      where.createdBy = { is: { regionId: params.regionId } };
    }
    if (params.category !== undefined) {
      where.AND = [
        {
          OR: [{ vendorTypeGroup: params.category }, { category: params.category }]
        }
      ];
    }
    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params.unassigned === true) {
      where.createdByUserId = null;
    } else if (params.createdByUserId !== undefined) {
      where.createdByUserId = params.createdByUserId;
    }

    const query = params.search?.trim() ?? "";
    if (query.length > 0) {
      const or: Prisma.OutletWhereInput[] = [
        { vendorCode: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { vendorTypeGroup: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { district: { contains: query, mode: "insensitive" } },
        { locationArea: { contains: query, mode: "insensitive" } },
        { landmark: { contains: query, mode: "insensitive" } },
        { region: { is: { name: { contains: query, mode: "insensitive" } } } },
        {
          createdBy: {
            is: { fullName: { contains: query, mode: "insensitive" } }
          }
        }
      ];
      if (params.includePersonalContactSearch !== false) {
        or.push(
          { contactName: { contains: query, mode: "insensitive" } },
          { contactPhone: { contains: query, mode: "insensitive" } },
          { contactPhoneSecondary: { contains: query, mode: "insensitive" } },
          { contactEmail: { contains: query, mode: "insensitive" } },
          {
            createdBy: {
              is: { phone: { contains: query, mode: "insensitive" } }
            }
          }
        );
      }
      where.OR = or;
    }
    return where;
  }

  public findById(id: string) {
    return this.prisma.outlet.findUnique({
      where: { id },
      select: outletSelect
    });
  }

  public findOnboardingPhotoBytes(ids: string[]) {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.outletOnboardingPhoto.findMany({
      where: { id: { in: ids } },
      select: { id: true, mimeType: true, imageBytes: true }
    });
  }

  public findUserRegionId(userId: string): Promise<string | null> {
    return this.prisma.user
      .findUnique({ where: { id: userId }, select: { regionId: true } })
      .then((row) => row?.regionId ?? null);
  }

  public listActiveRegions() {
    return this.prisma.region.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, code: true }
    });
  }

  public listPromoters() {
    return this.prisma.user.findMany({
      where: { role: "promoter" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, phone: true, isActive: true }
    });
  }

  public async create(data: OutletWriteData) {
    const { onboardingPhotos, ...outletFields } = data;
    return this.prisma.$transaction(async (tx) => {
      const vendorCode = await this.allocateVendorCode(tx, outletFields.regionId ?? null);
      return tx.outlet.create({
        data: {
          ...outletFields,
          vendorCode,
          ...(onboardingPhotos !== undefined && onboardingPhotos.length > 0
            ? {
                onboardingPhotos: {
                  create: onboardingPhotos.map((photo) => ({
                    category: photo.category,
                    cloudinaryPublicId: photo.cloudinaryPublicId,
                    cloudinaryUrl: photo.cloudinaryUrl,
                    mimeType: photo.mimeType,
                    imageBytes: photo.imageBytes
                  }))
                }
              }
            : {})
        },
        select: outletSelect
      });
    });
  }

  private async allocateVendorCode(
    tx: Prisma.TransactionClient,
    regionId: string | null
  ): Promise<string> {
    const prefix =
      regionId === null
        ? "UN"
        : ((await tx.region.findUnique({ where: { id: regionId }, select: { code: true } }))
            ?.code ?? "UN");
    const counter = await tx.vendorCodeCounter.upsert({
      where: { prefix },
      create: { prefix, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } }
    });
    return formatVendorCode(prefix, counter.lastSeq);
  }

  public update(id: string, data: Partial<Omit<OutletWriteData, "onboardingPhotos">>) {
    return this.prisma.outlet.update({
      where: { id },
      data,
      select: outletSelect
    });
  }

  public createVisit(
    data: {
      outletId: string;
      userId: string;
      latitude: number;
      longitude: number;
      outletPhotoMimeType: string | null;
      outletPhotoImage: Uint8Array<ArrayBuffer> | null;
      outletPhotoCloudinaryPublicId: string | null;
      outletPhotoCloudinaryUrl: string | null;
      hasOutletPhoto: boolean;
      stockAvailabilityNotes: string | null;
      consumerEngagementNotes: string | null;
      footfallEstimated?: number | null;
      footfallPeakPeriods?: string | null;
      trafficCategory?: TrafficCategory | null;
      footfallManualCount?: number | null;
      nestleProductAvailable?: boolean | null;
      nestleProductsJson?: string | null;
      productPlacementNotes?: string | null;
      shelfVisibilityNotes?: string | null;
      posMaterialsPresent?: boolean | null;
      promotionalMaterialsPresent?: boolean | null;
      stockLevelNotes?: string | null;
      outOfStock?: boolean | null;
      visibilityScore?: number | null;
      isComplete?: boolean;
      incompleteReasons?: string | null;
      photos?: {
        category: VisitPhotoCategory;
        cloudinaryPublicId: string | null;
        cloudinaryUrl: string | null;
        mimeType: string | null;
        imageBytes: Uint8Array<ArrayBuffer> | null;
      }[];
      competitors?: {
        brandName: string;
        brandNameOther: string | null;
        productsJson: string | null;
        pricingNotes: string | null;
        promotionsNotes: string | null;
        discountsNotes: string | null;
        newLaunchesNotes: string | null;
        displayQualityNotes: string | null;
        marketObservations: string | null;
      }[];
    },
    tx?: Prisma.TransactionClient
  ) {
    const { photos, competitors, ...visitFields } = data;
    return this.db(tx).outletVisit.create({
      data: {
        ...visitFields,
        ...(photos !== undefined && photos.length > 0
          ? {
              photos: {
                create: photos.map((p) => ({
                  category: p.category,
                  cloudinaryPublicId: p.cloudinaryPublicId,
                  cloudinaryUrl: p.cloudinaryUrl,
                  mimeType: p.mimeType,
                  imageBytes: p.imageBytes
                }))
              }
            }
          : {}),
        ...(competitors !== undefined && competitors.length > 0
          ? {
              competitorObservations: {
                create: competitors
              }
            }
          : {})
      },
      select: visitListSelect
    });
  }

  public listVisitsForUser(userId: string, take: number, from?: Date, to?: Date) {
    return this.prisma.outletVisit.findMany({
      where: {
        userId,
        ...(from !== undefined || to !== undefined
          ? {
              checkedInAt: {
                ...(from !== undefined ? { gte: from } : {}),
                ...(to !== undefined ? { lt: to } : {})
              }
            }
          : {})
      },
      orderBy: { checkedInAt: "desc" },
      take,
      select: {
        ...visitListSelect,
        outlet: {
          select: {
            id: true,
            vendorCode: true,
            name: true,
            vendorTypeGroup: true,
            category: true,
            distributorName: true,
            locationArea: true,
            district: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });
  }

  public async listVisitsForAdmin(params: {
    take: number;
    skip?: number;
    outletId?: string;
    userId?: string;
    from?: Date;
    to?: Date;
  }) {
    const where: {
      outletId?: string;
      userId?: string;
      checkedInAt?: { gte?: Date; lte?: Date };
    } = {};
    if (params.outletId !== undefined) {
      where.outletId = params.outletId;
    }
    if (params.userId !== undefined) {
      where.userId = params.userId;
    }
    if (params.from !== undefined || params.to !== undefined) {
      where.checkedInAt = {
        ...(params.from !== undefined ? { gte: params.from } : {}),
        ...(params.to !== undefined ? { lte: params.to } : {})
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.outletVisit.findMany({
        where,
        orderBy: { checkedInAt: "desc" },
        take: params.take,
        ...(params.skip !== undefined ? { skip: params.skip } : {}),
        select: {
          ...visitListSelect,
          outlet: {
            select: {
              id: true,
              vendorCode: true,
              name: true,
              vendorTypeGroup: true,
              category: true,
              distributorName: true,
              locationArea: true,
              district: true,
              regionId: true,
              latitude: true,
              longitude: true
            }
          },
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              role: true
            }
          }
        }
      }),
      this.prisma.outletVisit.count({ where })
    ]);

    return { items, total };
  }
}
