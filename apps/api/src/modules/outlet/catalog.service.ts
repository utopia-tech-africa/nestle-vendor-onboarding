import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import type { CreateCatalogItemDto } from "./dto/catalog-item.dto";
import type { UpdateCatalogItemDto } from "./dto/catalog-item.dto";
import {
  COMPETITOR_BRANDS,
  COMPETITOR_PRODUCTS_BY_BRAND,
  NESTLE_PRODUCTS,
  VENDOR_TYPES,
  VENDOR_TYPE_VALUES_BY_TYPE,
  getFieldCatalogs,
  type CatalogOption,
  type FieldCatalogs
} from "./field-catalogs";
import { CatalogRepository } from "./catalog.repository";

const CATALOG_MANAGER_ROLES = new Set<UserRole>(["admin", "supervisor"]);

const option = (name: string): CatalogOption => ({ value: name, label: name });

@Injectable()
export class CatalogService {
  public constructor(@Inject(CatalogRepository) private readonly catalogRepository: CatalogRepository) {}

  public requireManager(currentUser: AuthenticatedUser): void {
    if (!CATALOG_MANAGER_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor or admin users can manage product catalogs");
    }
  }

  private static isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    );
  }

  public async getFieldCatalogs(): Promise<FieldCatalogs> {
    const staticCatalogs = getFieldCatalogs();
    const [nestleRows, brandRows, vendorTypeRows] = await Promise.all([
      this.catalogRepository.listNestleProducts(true),
      this.catalogRepository.listCompetitorBrands(true),
      this.catalogRepository.listVendorTypes(true)
    ]);

    const nestleProducts =
      nestleRows.length > 0 ? nestleRows.map((row) => option(row.name)) : NESTLE_PRODUCTS;
    const competitorBrands =
      brandRows.length > 0 ? brandRows.map((row) => option(row.name)) : COMPETITOR_BRANDS;
    const competitorProductsByBrand: Record<string, CatalogOption[]> =
      brandRows.length > 0
        ? Object.fromEntries(
            brandRows.map((brand) => [brand.name, brand.products.map((product) => option(product.name))])
          )
        : COMPETITOR_PRODUCTS_BY_BRAND;
    const vendorTypes =
      vendorTypeRows.length > 0 ? vendorTypeRows.map((row) => option(row.name)) : VENDOR_TYPES;
    const vendorTypeValuesByType: Record<string, CatalogOption[]> =
      vendorTypeRows.length > 0
        ? Object.fromEntries(
            vendorTypeRows.map((type) => [type.name, type.values.map((value) => option(value.name))])
          )
        : VENDOR_TYPE_VALUES_BY_TYPE;

    return {
      ...staticCatalogs,
      nestleProducts,
      competitorBrands,
      competitorProductsByBrand,
      vendorTypes,
      vendorTypeValuesByType
    };
  }

  public async listForAdmin(currentUser: AuthenticatedUser) {
    this.requireManager(currentUser);
    const [nestleProducts, competitorBrands, vendorTypes] = await Promise.all([
      this.catalogRepository.listNestleProducts(false),
      this.catalogRepository.listCompetitorBrands(false),
      this.catalogRepository.listVendorTypes(false)
    ]);
    return { nestleProducts, competitorBrands, vendorTypes };
  }

  public async createNestleProduct(currentUser: AuthenticatedUser, dto: CreateCatalogItemDto) {
    this.requireManager(currentUser);
    try {
      return await this.catalogRepository.createNestleProduct({
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true
      });
    } catch (error: unknown) {
      if (CatalogService.isUniqueViolation(error)) {
        throw new ConflictException("A Nestlé product with this name already exists");
      }
      throw error;
    }
  }

  public async updateNestleProduct(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateCatalogItemDto
  ) {
    this.requireManager(currentUser);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }
    const existing = await this.catalogRepository.findNestleProduct(id);
    if (existing === null) {
      throw new NotFoundException("Nestlé product not found");
    }
    try {
      return await this.catalogRepository.updateNestleProduct(id, {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
      });
    } catch (error: unknown) {
      if (CatalogService.isUniqueViolation(error)) {
        throw new ConflictException("A Nestlé product with this name already exists");
      }
      throw error;
    }
  }

  public async deleteNestleProduct(currentUser: AuthenticatedUser, id: string) {
    this.requireManager(currentUser);
    const existing = await this.catalogRepository.findNestleProduct(id);
    if (existing === null) {
      throw new NotFoundException("Nestlé product not found");
    }
    await this.catalogRepository.deleteNestleProduct(id);
    return { ok: true as const };
  }

  public async createCompetitorBrand(currentUser: AuthenticatedUser, dto: CreateCatalogItemDto) {
    this.requireManager(currentUser);
    try {
      return await this.catalogRepository.createCompetitorBrand({
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true
      });
    } catch (error: unknown) {
      if (CatalogService.isUniqueViolation(error)) {
        throw new ConflictException("A competitor brand with this name already exists");
      }
      throw error;
    }
  }

  public async updateCompetitorBrand(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateCatalogItemDto
  ) {
    this.requireManager(currentUser);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }
    const existing = await this.catalogRepository.findCompetitorBrand(id);
    if (existing === null) {
      throw new NotFoundException("Competitor brand not found");
    }
    try {
      return await this.catalogRepository.updateCompetitorBrand(id, {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
      });
    } catch (error: unknown) {
      if (CatalogService.isUniqueViolation(error)) {
        throw new ConflictException("A competitor brand with this name already exists");
      }
      throw error;
    }
  }

  public async deleteCompetitorBrand(currentUser: AuthenticatedUser, id: string) {
    this.requireManager(currentUser);
    const existing = await this.catalogRepository.findCompetitorBrand(id);
    if (existing === null) {
      throw new NotFoundException("Competitor brand not found");
    }
    await this.catalogRepository.deleteCompetitorBrand(id);
    return { ok: true as const };
  }

  public async createCompetitorProduct(
    currentUser: AuthenticatedUser,
    brandId: string,
    dto: CreateCatalogItemDto
  ) {
    this.requireManager(currentUser);
    const brand = await this.catalogRepository.findCompetitorBrand(brandId);
    if (brand === null) {
      throw new NotFoundException("Competitor brand not found");
    }
    try {
      return await this.catalogRepository.createCompetitorProduct({
        brandId,
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true
      });
    } catch (error: unknown) {
      if (CatalogService.isUniqueViolation(error)) {
        throw new ConflictException("This brand already has a product with that name");
      }
      throw error;
    }
  }

  public async updateCompetitorProduct(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateCatalogItemDto
  ) {
    this.requireManager(currentUser);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }
    const existing = await this.catalogRepository.findCompetitorProduct(id);
    if (existing === null) {
      throw new NotFoundException("Competitor product not found");
    }
    try {
      return await this.catalogRepository.updateCompetitorProduct(id, {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
      });
    } catch (error: unknown) {
      if (CatalogService.isUniqueViolation(error)) {
        throw new ConflictException("This brand already has a product with that name");
      }
      throw error;
    }
  }

  public async deleteCompetitorProduct(currentUser: AuthenticatedUser, id: string) {
    this.requireManager(currentUser);
    const existing = await this.catalogRepository.findCompetitorProduct(id);
    if (existing === null) {
      throw new NotFoundException("Competitor product not found");
    }
    await this.catalogRepository.deleteCompetitorProduct(id);
    return { ok: true as const };
  }

  public async createVendorType(currentUser: AuthenticatedUser, dto: CreateCatalogItemDto) {
    this.requireManager(currentUser);
    try {
      return await this.catalogRepository.createVendorType({
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true
      });
    } catch (error: unknown) {
      if (CatalogService.isUniqueViolation(error)) {
        throw new ConflictException("A vendor type with this name already exists");
      }
      throw error;
    }
  }

  public async updateVendorType(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateCatalogItemDto
  ) {
    this.requireManager(currentUser);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }
    const existing = await this.catalogRepository.findVendorType(id);
    if (existing === null) {
      throw new NotFoundException("Vendor type not found");
    }
    try {
      return await this.catalogRepository.updateVendorType(id, {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
      });
    } catch (error: unknown) {
      if (CatalogService.isUniqueViolation(error)) {
        throw new ConflictException("A vendor type with this name already exists");
      }
      throw error;
    }
  }

  public async deleteVendorType(currentUser: AuthenticatedUser, id: string) {
    this.requireManager(currentUser);
    const existing = await this.catalogRepository.findVendorType(id);
    if (existing === null) {
      throw new NotFoundException("Vendor type not found");
    }
    await this.catalogRepository.deleteVendorType(id);
    return { ok: true as const };
  }

  public async createVendorTypeValue(
    currentUser: AuthenticatedUser,
    typeId: string,
    dto: CreateCatalogItemDto
  ) {
    this.requireManager(currentUser);
    const type = await this.catalogRepository.findVendorType(typeId);
    if (type === null) {
      throw new NotFoundException("Vendor type not found");
    }
    try {
      return await this.catalogRepository.createVendorTypeValue({
        typeId,
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true
      });
    } catch (error: unknown) {
      if (CatalogService.isUniqueViolation(error)) {
        throw new ConflictException("This vendor type already has a value with that name");
      }
      throw error;
    }
  }

  public async updateVendorTypeValue(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateCatalogItemDto
  ) {
    this.requireManager(currentUser);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }
    const existing = await this.catalogRepository.findVendorTypeValue(id);
    if (existing === null) {
      throw new NotFoundException("Vendor type value not found");
    }
    try {
      return await this.catalogRepository.updateVendorTypeValue(id, {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
      });
    } catch (error: unknown) {
      if (CatalogService.isUniqueViolation(error)) {
        throw new ConflictException("This vendor type already has a value with that name");
      }
      throw error;
    }
  }

  public async deleteVendorTypeValue(currentUser: AuthenticatedUser, id: string) {
    this.requireManager(currentUser);
    const existing = await this.catalogRepository.findVendorTypeValue(id);
    if (existing === null) {
      throw new NotFoundException("Vendor type value not found");
    }
    await this.catalogRepository.deleteVendorTypeValue(id);
    return { ok: true as const };
  }
}
