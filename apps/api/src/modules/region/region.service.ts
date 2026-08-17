import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import type { CreateRegionDto } from "./dto/create-region.dto";
import type { UpdateRegionDto } from "./dto/update-region.dto";
import { RegionRepository } from "./region.repository";
import { slugifyRegionName } from "./slug.util";
import {
  deriveRegionCodeFromSlug,
  isValidRegionCode,
  normalizeRegionCode
} from "./region-code.util";

const REGION_MANAGER_ROLES = new Set<UserRole>(["admin", "supervisor"]);
const REGION_VIEWER_ROLES = new Set<UserRole>(["admin", "supervisor", "client"]);

@Injectable()
export class RegionService {
  public constructor(@Inject(RegionRepository) private readonly repository: RegionRepository) {}

  public requireSupervisorOrAdmin(currentUser: AuthenticatedUser): void {
    if (!REGION_MANAGER_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor or admin users can manage regions");
    }
  }

  public requireViewer(currentUser: AuthenticatedUser): void {
    if (!REGION_VIEWER_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor, admin, or client can view regions");
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

  public listForAdmin(currentUser: AuthenticatedUser) {
    this.requireViewer(currentUser);
    return this.repository.findAll();
  }

  public async createForAdmin(currentUser: AuthenticatedUser, dto: CreateRegionDto) {
    this.requireSupervisorOrAdmin(currentUser);
    const name = dto.name.trim();
    const explicit =
      dto.slug !== undefined && dto.slug.trim().length > 0
        ? dto.slug.trim().toLowerCase()
        : undefined;
    const base = explicit ?? slugifyRegionName(name);
    if (base.length < 2) {
      throw new BadRequestException(
        "Display name must yield a slug of at least 2 characters (letters or numbers)."
      );
    }
    const slug = await this.allocateUniqueSlug(base.slice(0, 64));
    const code = await this.resolveCreateCode(slug, dto.code);
    try {
      return await this.repository.create({
        slug,
        name,
        code,
        isActive: dto.isActive ?? true
      });
    } catch (error: unknown) {
      if (RegionService.isUniqueViolation(error)) {
        throw new ConflictException("A region with this slug or code already exists");
      }
      throw error;
    }
  }

  private async allocateUniqueSlug(base: string): Promise<string> {
    const normalized = base.slice(0, 64);
    let candidate = normalized;
    for (let n = 2; (await this.repository.findBySlug(candidate)) !== null; n += 1) {
      const suffix = `-${String(n)}`;
      const maxStem = Math.max(1, 64 - suffix.length);
      candidate = `${normalized.slice(0, maxStem)}${suffix}`;
      if (n > 500) {
        throw new BadRequestException("Could not allocate a unique slug; try a different name.");
      }
    }
    return candidate;
  }

  public async updateForAdmin(currentUser: AuthenticatedUser, id: string, dto: UpdateRegionDto) {
    this.requireSupervisorOrAdmin(currentUser);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException("Region not found");
    }
    const patch: {
      slug?: string;
      name?: string;
      code?: string;
      isActive?: boolean;
    } = {};
    if (dto.slug !== undefined) {
      patch.slug = dto.slug.trim().toLowerCase();
    }
    if (dto.name !== undefined) {
      patch.name = dto.name.trim();
    }
    if (dto.code !== undefined) {
      const code = normalizeRegionCode(dto.code);
      if (!isValidRegionCode(code)) {
        throw new BadRequestException("code must be 2–4 letters (e.g. GA)");
      }
      patch.code = code;
    }
    if (dto.isActive !== undefined) {
      patch.isActive = dto.isActive;
    }
    try {
      return await this.repository.update(id, patch);
    } catch (error: unknown) {
      if (RegionService.isUniqueViolation(error)) {
        throw new ConflictException("A region with this slug or code already exists");
      }
      throw error;
    }
  }

  private async resolveCreateCode(slug: string, explicit?: string): Promise<string> {
    if (explicit !== undefined && explicit.trim().length > 0) {
      const code = normalizeRegionCode(explicit);
      if (!isValidRegionCode(code)) {
        throw new BadRequestException("code must be 2–4 letters (e.g. GA)");
      }
      if ((await this.repository.findByCode(code)) !== null) {
        throw new ConflictException("A region with this code already exists");
      }
      return code;
    }
    return this.allocateUniqueCode(deriveRegionCodeFromSlug(slug));
  }

  private async allocateUniqueCode(base: string): Promise<string> {
    const normalized = normalizeRegionCode(base).slice(0, 4);
    let candidate = normalized;
    for (let n = 2; (await this.repository.findByCode(candidate)) !== null; n += 1) {
      const suffix = String(n);
      const maxStem = Math.max(1, 4 - suffix.length);
      candidate = `${normalized.slice(0, maxStem)}${suffix}`;
      if (n > 500) {
        throw new BadRequestException("Could not allocate a unique region code; try a different name.");
      }
    }
    return candidate;
  }
}
