import { Inject, Injectable } from "@nestjs/common";

import type { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const nestleSelect = {
  id: true,
  name: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.CatalogNestleProductSelect;

const competitorProductSelect = {
  id: true,
  brandId: true,
  name: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.CatalogCompetitorProductSelect;

const competitorBrandSelect = {
  id: true,
  name: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  products: {
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: competitorProductSelect
  }
} satisfies Prisma.CatalogCompetitorBrandSelect;

@Injectable()
export class CatalogRepository {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public listNestleProducts(activeOnly: boolean) {
    return this.prisma.catalogNestleProduct.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: nestleSelect
    });
  }

  public listCompetitorBrands(activeOnly: boolean) {
    return this.prisma.catalogCompetitorBrand.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        products: {
          where: activeOnly ? { isActive: true } : {},
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: competitorProductSelect
        }
      }
    });
  }

  public createNestleProduct(data: { name: string; sortOrder: number; isActive: boolean }) {
    return this.prisma.catalogNestleProduct.create({ data, select: nestleSelect });
  }

  public updateNestleProduct(
    id: string,
    data: Partial<{ name: string; sortOrder: number; isActive: boolean }>
  ) {
    return this.prisma.catalogNestleProduct.update({ where: { id }, data, select: nestleSelect });
  }

  public deleteNestleProduct(id: string) {
    return this.prisma.catalogNestleProduct.delete({ where: { id }, select: { id: true } });
  }

  public findNestleProduct(id: string) {
    return this.prisma.catalogNestleProduct.findUnique({ where: { id }, select: nestleSelect });
  }

  public createCompetitorBrand(data: { name: string; sortOrder: number; isActive: boolean }) {
    return this.prisma.catalogCompetitorBrand.create({ data, select: competitorBrandSelect });
  }

  public updateCompetitorBrand(
    id: string,
    data: Partial<{ name: string; sortOrder: number; isActive: boolean }>
  ) {
    return this.prisma.catalogCompetitorBrand.update({
      where: { id },
      data,
      select: competitorBrandSelect
    });
  }

  public deleteCompetitorBrand(id: string) {
    return this.prisma.catalogCompetitorBrand.delete({ where: { id }, select: { id: true } });
  }

  public findCompetitorBrand(id: string) {
    return this.prisma.catalogCompetitorBrand.findUnique({
      where: { id },
      select: competitorBrandSelect
    });
  }

  public createCompetitorProduct(data: {
    brandId: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
  }) {
    return this.prisma.catalogCompetitorProduct.create({ data, select: competitorProductSelect });
  }

  public updateCompetitorProduct(
    id: string,
    data: Partial<{ name: string; sortOrder: number; isActive: boolean }>
  ) {
    return this.prisma.catalogCompetitorProduct.update({
      where: { id },
      data,
      select: competitorProductSelect
    });
  }

  public deleteCompetitorProduct(id: string) {
    return this.prisma.catalogCompetitorProduct.delete({ where: { id }, select: { id: true } });
  }

  public findCompetitorProduct(id: string) {
    return this.prisma.catalogCompetitorProduct.findUnique({
      where: { id },
      select: competitorProductSelect
    });
  }
}
