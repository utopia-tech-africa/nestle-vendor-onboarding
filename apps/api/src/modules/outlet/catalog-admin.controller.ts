import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CatalogService } from "./catalog.service";
import { CreateCatalogItemDto, UpdateCatalogItemDto } from "./dto/catalog-item.dto";

@Controller("admin/catalogs")
@ApiTags("Admin catalogs (supervisor / admin)")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class CatalogAdminController {
  public constructor(@Inject(CatalogService) private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({
    operationId: "AdminCatalog_listCatalogs",
    summary: "List Nestlé products, competitor catalogs, and vendor types"
  })
  @ApiOkResponse({ description: "Editable catalog rows" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public listCatalogs(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.catalogService.listForAdmin(currentUser);
  }

  @Post("nestle-products")
  @ApiOperation({
    operationId: "AdminCatalog_createNestleProduct",
    summary: "Add a Nestlé product"
  })
  @ApiBody({ type: CreateCatalogItemDto })
  @ApiCreatedResponse({ description: "Product created" })
  @ApiConflictResponse({ description: "Name already exists" })
  public createNestleProduct(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateCatalogItemDto
  ) {
    return this.catalogService.createNestleProduct(currentUser, body);
  }

  @Patch("nestle-products/:id")
  @ApiOperation({
    operationId: "AdminCatalog_updateNestleProduct",
    summary: "Update a Nestlé product"
  })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateCatalogItemDto })
  @ApiOkResponse({ description: "Product updated" })
  @ApiNotFoundResponse({ description: "Not found" })
  public updateNestleProduct(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateCatalogItemDto
  ) {
    return this.catalogService.updateNestleProduct(currentUser, id, body);
  }

  @Delete("nestle-products/:id")
  @ApiOperation({
    operationId: "AdminCatalog_deleteNestleProduct",
    summary: "Delete a Nestlé product"
  })
  @ApiParam({ name: "id" })
  @ApiOkResponse({ description: "Deleted" })
  public deleteNestleProduct(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string
  ) {
    return this.catalogService.deleteNestleProduct(currentUser, id);
  }

  @Post("competitor-brands")
  @ApiOperation({
    operationId: "AdminCatalog_createCompetitorBrand",
    summary: "Add a competitor brand"
  })
  @ApiBody({ type: CreateCatalogItemDto })
  @ApiCreatedResponse({ description: "Brand created" })
  public createCompetitorBrand(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateCatalogItemDto
  ) {
    return this.catalogService.createCompetitorBrand(currentUser, body);
  }

  @Patch("competitor-brands/:id")
  @ApiOperation({
    operationId: "AdminCatalog_updateCompetitorBrand",
    summary: "Update a competitor brand"
  })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateCatalogItemDto })
  @ApiOkResponse({ description: "Brand updated" })
  public updateCompetitorBrand(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateCatalogItemDto
  ) {
    return this.catalogService.updateCompetitorBrand(currentUser, id, body);
  }

  @Delete("competitor-brands/:id")
  @ApiOperation({
    operationId: "AdminCatalog_deleteCompetitorBrand",
    summary: "Delete a competitor brand and its products"
  })
  @ApiParam({ name: "id" })
  @ApiOkResponse({ description: "Deleted" })
  public deleteCompetitorBrand(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string
  ) {
    return this.catalogService.deleteCompetitorBrand(currentUser, id);
  }

  @Post("competitor-brands/:brandId/products")
  @ApiOperation({
    operationId: "AdminCatalog_createCompetitorProduct",
    summary: "Add a product under a competitor brand"
  })
  @ApiParam({ name: "brandId" })
  @ApiBody({ type: CreateCatalogItemDto })
  @ApiCreatedResponse({ description: "Product created" })
  public createCompetitorProduct(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("brandId") brandId: string,
    @Body() body: CreateCatalogItemDto
  ) {
    return this.catalogService.createCompetitorProduct(currentUser, brandId, body);
  }

  @Patch("competitor-products/:id")
  @ApiOperation({
    operationId: "AdminCatalog_updateCompetitorProduct",
    summary: "Update a competitor product"
  })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateCatalogItemDto })
  @ApiOkResponse({ description: "Product updated" })
  public updateCompetitorProduct(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateCatalogItemDto
  ) {
    return this.catalogService.updateCompetitorProduct(currentUser, id, body);
  }

  @Delete("competitor-products/:id")
  @ApiOperation({
    operationId: "AdminCatalog_deleteCompetitorProduct",
    summary: "Delete a competitor product"
  })
  @ApiParam({ name: "id" })
  @ApiOkResponse({ description: "Deleted" })
  public deleteCompetitorProduct(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string
  ) {
    return this.catalogService.deleteCompetitorProduct(currentUser, id);
  }

  @Post("vendor-types")
  @ApiOperation({
    operationId: "AdminCatalog_createVendorType",
    summary: "Add a vendor type"
  })
  @ApiBody({ type: CreateCatalogItemDto })
  @ApiCreatedResponse({ description: "Vendor type created" })
  public createVendorType(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateCatalogItemDto
  ) {
    return this.catalogService.createVendorType(currentUser, body);
  }

  @Patch("vendor-types/:id")
  @ApiOperation({
    operationId: "AdminCatalog_updateVendorType",
    summary: "Update a vendor type"
  })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateCatalogItemDto })
  @ApiOkResponse({ description: "Vendor type updated" })
  public updateVendorType(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateCatalogItemDto
  ) {
    return this.catalogService.updateVendorType(currentUser, id, body);
  }

  @Delete("vendor-types/:id")
  @ApiOperation({
    operationId: "AdminCatalog_deleteVendorType",
    summary: "Delete a vendor type and its values"
  })
  @ApiParam({ name: "id" })
  @ApiOkResponse({ description: "Deleted" })
  public deleteVendorType(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string
  ) {
    return this.catalogService.deleteVendorType(currentUser, id);
  }

  @Post("vendor-types/:typeId/values")
  @ApiOperation({
    operationId: "AdminCatalog_createVendorTypeValue",
    summary: "Add a seller type under a vendor type"
  })
  @ApiParam({ name: "typeId" })
  @ApiBody({ type: CreateCatalogItemDto })
  @ApiCreatedResponse({ description: "Value created" })
  public createVendorTypeValue(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("typeId") typeId: string,
    @Body() body: CreateCatalogItemDto
  ) {
    return this.catalogService.createVendorTypeValue(currentUser, typeId, body);
  }

  @Patch("vendor-type-values/:id")
  @ApiOperation({
    operationId: "AdminCatalog_updateVendorTypeValue",
    summary: "Update a vendor type value"
  })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateCatalogItemDto })
  @ApiOkResponse({ description: "Value updated" })
  public updateVendorTypeValue(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateCatalogItemDto
  ) {
    return this.catalogService.updateVendorTypeValue(currentUser, id, body);
  }

  @Delete("vendor-type-values/:id")
  @ApiOperation({
    operationId: "AdminCatalog_deleteVendorTypeValue",
    summary: "Delete a vendor type value"
  })
  @ApiParam({ name: "id" })
  @ApiOkResponse({ description: "Deleted" })
  public deleteVendorTypeValue(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string
  ) {
    return this.catalogService.deleteVendorTypeValue(currentUser, id);
  }
}
