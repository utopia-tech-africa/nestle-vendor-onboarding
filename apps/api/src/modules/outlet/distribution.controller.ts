import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CatalogService } from "./catalog.service";
import { CreateCatalogItemDto } from "./dto/catalog-item.dto";
import { UpdateCatalogItemDto } from "./dto/catalog-item.dto";
import { IssueOutletItemDto } from "./dto/issue-outlet-item.dto";
import { OutletService } from "./outlet.service";

@Controller("distribution")
@ApiTags("Vendor item distribution")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class DistributionController {
  public constructor(
    @Inject(OutletService) private readonly outletService: OutletService,
    @Inject(CatalogService) private readonly catalogService: CatalogService
  ) {}

  @Get("items")
  @ApiOperation({
    operationId: "Distribution_listItems",
    summary: "List items that can be given to vendors"
  })
  @ApiQuery({ name: "includeInactive", required: false, description: "Include inactive items (ops only)" })
  @ApiOkResponse({ description: "Distribution items" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Not allowed" })
  public listItems(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("includeInactive") includeInactive?: string
  ) {
    return this.outletService.listDistributionItemsForViewer(
      currentUser,
      includeInactive === "true"
    );
  }

  @Post("items")
  @ApiOperation({
    operationId: "Distribution_createItem",
    summary: "Add an item that can be given to vendors"
  })
  @ApiBody({ type: CreateCatalogItemDto })
  @ApiCreatedResponse({ description: "Item created" })
  @ApiConflictResponse({ description: "Name already exists" })
  public createItem(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateCatalogItemDto
  ) {
    return this.catalogService.createDistributionItem(currentUser, body);
  }

  @Patch("items/:id")
  @ApiOperation({
    operationId: "Distribution_updateItem",
    summary: "Update a distribution item"
  })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateCatalogItemDto })
  @ApiOkResponse({ description: "Item updated" })
  @ApiNotFoundResponse({ description: "Not found" })
  public updateItem(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateCatalogItemDto
  ) {
    return this.catalogService.updateDistributionItem(currentUser, id, body);
  }

  @Delete("items/:id")
  @ApiOperation({
    operationId: "Distribution_deleteItem",
    summary: "Delete a distribution item"
  })
  @ApiParam({ name: "id" })
  @ApiOkResponse({ description: "Deleted" })
  public deleteItem(@CurrentUser() currentUser: AuthenticatedUser, @Param("id") id: string) {
    return this.catalogService.deleteDistributionItem(currentUser, id);
  }

  @Get("vendors")
  @ApiOperation({
    operationId: "Distribution_lookupVendor",
    summary: "Look up a vendor by phone and see which items she has been given"
  })
  @ApiQuery({ name: "q", required: false, description: "Phone number, e.g. 0244123456" })
  @ApiQuery({ name: "code", required: false, description: "Legacy vendor ID lookup" })
  @ApiOkResponse({ description: "Vendor and item status, or a list if several numbers match" })
  @ApiNotFoundResponse({ description: "Vendor not found" })
  public lookupVendor(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("q") q?: string,
    @Query("code") code?: string
  ) {
    return this.outletService.lookupVendorItems(currentUser, (q ?? code ?? "").trim());
  }

  @Get("outlets/:outletId")
  @ApiOperation({
    operationId: "Distribution_getVendorItems",
    summary: "See which items a vendor has been given"
  })
  @ApiParam({ name: "outletId" })
  @ApiOkResponse({ description: "Vendor and item status" })
  @ApiNotFoundResponse({ description: "Vendor not found" })
  public getVendorItems(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("outletId") outletId: string
  ) {
    return this.outletService.lookupVendorItemsByOutletId(currentUser, outletId);
  }

  @Post("outlets/:outletId/items/:itemId")
  @HttpCode(200)
  @ApiOperation({
    operationId: "Distribution_markGiven",
    summary: "Mark an item as given to a vendor"
  })
  @ApiParam({ name: "outletId" })
  @ApiParam({ name: "itemId" })
  @ApiBody({ type: IssueOutletItemDto, required: false })
  @ApiOkResponse({ description: "Updated vendor item status" })
  @ApiConflictResponse({ description: "Already given" })
  public markGiven(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("outletId") outletId: string,
    @Param("itemId") itemId: string,
    @Body() body: IssueOutletItemDto
  ) {
    return this.outletService.markItemGiven(currentUser, outletId, itemId, body.notes);
  }

  @Delete("outlets/:outletId/items/:itemId")
  @ApiOperation({
    operationId: "Distribution_revokeGiven",
    summary: "Mark an item as not given"
  })
  @ApiParam({ name: "outletId" })
  @ApiParam({ name: "itemId" })
  @ApiOkResponse({ description: "Updated vendor item status" })
  public revokeGiven(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("outletId") outletId: string,
    @Param("itemId") itemId: string
  ) {
    return this.outletService.revokeItemGiven(currentUser, outletId, itemId);
  }
}
