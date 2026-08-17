import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OutletService } from "../outlet/outlet.service";
import { CreateFieldOutletDto } from "../outlet/dto/create-field-outlet.dto";
import { CatalogService } from "../outlet/catalog.service";
import { QuestionnaireService } from "../questionnaire/questionnaire.service";
import { CreateOutletVisitDto } from "./dto/create-outlet-visit.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { UpdateMeDto } from "./dto/update-me.dto";
import { MeService } from "./me.service";

@Controller("me")
@UseGuards(JwtAuthGuard)
@ApiTags("Me")
@ApiBearerAuth("bearer")
export class MeController {
  public constructor(
    @Inject(MeService) private readonly meService: MeService,
    @Inject(OutletService) private readonly outletService: OutletService,
    @Inject(CatalogService) private readonly catalogService: CatalogService,
    @Inject(QuestionnaireService) private readonly questionnaireService: QuestionnaireService
  ) {}

  @Get()
  @ApiOperation({
    operationId: "Me_getMe",
    summary: "Get current user profile",
    description: "Returns the authenticated user's profile details."
  })
  @ApiOkResponse({
    description: "Current user profile",
    schema: {
      example: {
        id: "cmad4p0bo0000iib0i0l9e8wk",
        fullName: "John Doe",
        phone: "0244123456",
        role: "promoter",
        gender: "male",
        regionId: "nairobi-west",
        regionName: "Nairobi West"
      }
    }
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  @ApiNotFoundResponse({ description: "User profile not found" })
  public getMe(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.meService.getCurrentUser(currentUser);
  }

  @Get("field-attendance")
  @ApiOperation({
    operationId: "Me_getFieldAttendance",
    summary: "Field attendance gate and segment suggestion",
    description:
      "For promoters: local-day clock-in gate (`needsDailyClockIn`), recurring GPS+selfie re-check (`needsRecurringClockIn`), and clock-in/clock-out suggestion. Non-promoters get `applicable: false`."
  })
  @ApiOkResponse({
    description: "Field attendance status",
    schema: {
      example: {
        applicable: true,
        timezone: "Africa/Nairobi",
        localDate: "2026-05-12",
        needsDailyClockIn: true,
        needsRecurringClockIn: false,
        suggestedNextAttendanceKind: "clock_in",
        geofenceWatch: {
          enabled: false,
          graceSeconds: 60,
          zones: []
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public getFieldAttendance(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.meService.getFieldAttendance(currentUser);
  }

  @Get("catalogs")
  @ApiOperation({
    operationId: "Me_getCatalogs",
    summary: "Field and vendor dropdown catalogs",
    description:
      "Closed-set options for vendor onboarding and visit forms (types, roles, products, peak periods)."
  })
  @ApiOkResponse({ description: "Catalog option lists" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public getCatalogs() {
    return this.catalogService.getFieldCatalogs();
  }

  @Patch()
  @ApiOperation({
    operationId: "Me_updateMe",
    summary: "Update current user profile",
    description: "Updates one or more profile fields for the authenticated user."
  })
  @ApiBody({
    type: UpdateMeDto,
    examples: {
      updateNameAndRegion: {
        summary: "Update name and region",
        value: {
          fullName: "John Doe",
          regionId: "nairobi-east"
        }
      }
    }
  })
  @ApiOkResponse({
    description: "Updated profile",
    schema: {
      example: {
        id: "cmad4p0bo0000iib0i0l9e8wk",
        fullName: "John Doe",
        phone: "0244123456",
        role: "promoter",
        gender: "male",
        regionId: "nairobi-east"
      }
    }
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public updateMe(@CurrentUser() currentUser: AuthenticatedUser, @Body() body: UpdateMeDto) {
    return this.meService.updateCurrentUser(currentUser, body);
  }

  @Get("location/history")
  @ApiOperation({
    operationId: "Me_listLocationHistory",
    summary: "List own location check-ins",
    description: "Returns recent location pings for the authenticated user, newest first."
  })
  @ApiOkResponse({
    description: "Location ping rows",
    schema: {
      example: [
        {
          id: "cmad4p0bo0000iib0i0l9e8wk",
          attendanceKind: "clock_in",
          geofenceId: "cmad4p0bo0000iib0i0l9e8wk",
          distanceToGeofenceMeters: 42.7,
          dwellSecondsAtGeofence: 480,
          latitude: -1.286389,
          longitude: 36.817223,
          placeLabel: "City Square, Nairobi, Kenya",
          hasSelfieVerification: true,
          recordedAt: "2026-05-08T18:20:00.000Z"
        }
      ]
    }
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Maximum rows to return (1–100, default 50)",
    schema: { type: "integer", default: 50, minimum: 1, maximum: 100 }
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public listLocationHistory(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number
  ) {
    return this.meService.listLocationHistory(currentUser, limit);
  }

  @Get("cloudinary-upload-signature")
  @ApiOperation({
    operationId: "Me_getCloudinaryUploadSignature",
    summary: "Signed Cloudinary upload parameters",
    description:
      "Returns parameters for a direct browser upload to Cloudinary (authenticated assets). Use before clock-in or outlet visit photo submission."
  })
  @ApiQuery({
    name: "purpose",
    required: true,
    enum: ["attendance", "outlet_visit"],
    description: "Upload folder scope for the authenticated user"
  })
  @ApiOkResponse({
    description: "Signed upload parameters",
    schema: {
      example: {
        cloudName: "your-cloud",
        apiKey: "123456789012345",
        timestamp: 1716729600,
        signature: "abc123",
        folder: "nestle/attendance/cmad4p0bo0000iib0i0l9e8wk",
        accessMode: "authenticated"
      }
    }
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public getCloudinaryUploadSignature(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("purpose") purpose: string
  ) {
    if (purpose !== "attendance" && purpose !== "outlet_visit") {
      throw new BadRequestException('Query "purpose" must be attendance or outlet_visit');
    }
    return this.meService.getCloudinaryUploadSignature(currentUser, purpose);
  }

  @Post("location")
  @ApiOperation({
    operationId: "Me_updateMeLocation",
    summary: "Record user location",
    description:
      "Stores a location ping for attendance. Selfie is required except for `autoClockOut` clock-out after leaving a work-area radius."
  })
  @ApiBody({
    type: UpdateLocationDto,
    examples: {
      nairobiDowntown: {
        summary: "Nairobi CBD check-in with selfie",
        value: {
          latitude: -1.286389,
          longitude: 36.817223,
          attendanceKind: "clock_in",
          selfieCloudinaryPublicId: "nestle/attendance/cmad4p0bo0000iib0i0l9e8wk/sample"
        }
      }
    }
  })
  @ApiOkResponse({
    description: "Recorded location ping",
    schema: {
      example: {
        userId: "cmad4p0bo0000iib0i0l9e8wk",
        attendanceKind: "clock_in",
        geofenceId: "cmad4p0bo0000iib0i0l9e8wk",
        distanceToGeofenceMeters: 42.7,
        dwellSecondsAtGeofence: 480,
        latitude: -1.286389,
        longitude: 36.817223,
        placeLabel: "City Square, Nairobi, Kenya",
        hasSelfieVerification: true,
        recordedAt: "2026-05-08T18:20:00.000Z"
      }
    }
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public updateMeLocation(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: UpdateLocationDto
  ) {
    return this.meService.updateLocation(currentUser, body);
  }

  @Get("outlets")
  @ApiOperation({
    operationId: "Me_listOutlets",
    summary: "List active vendors (field)",
    description: "Returns active vendors for promoters to select when recording a visit."
  })
  @ApiOkResponse({ description: "Active vendor rows" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  @ApiForbiddenResponse({ description: "Requires promoter role" })
  public listOutlets(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.outletService.listForField(currentUser);
  }

  @Get("regions")
  @ApiOperation({
    operationId: "Me_listRegions",
    summary: "List active regions for vendor onboarding"
  })
  @ApiOkResponse({ description: "Active regions" })
  @ApiForbiddenResponse({ description: "Requires promoter role" })
  public listRegions(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.outletService.listActiveRegionsForField(currentUser);
  }

  @Get("questionnaires/active")
  @ApiOperation({
    operationId: "Me_getActiveQuestionnaire",
    summary: "Get active questionnaire for visits"
  })
  @ApiOkResponse({ description: "Active questionnaire or null" })
  public getActiveQuestionnaire() {
    return this.questionnaireService.getActiveForField();
  }

  @Post("outlets")
  @ApiOperation({
    operationId: "Me_createOutlet",
    summary: "Create vendor (field)",
    description:
      "Promoters add a new vendor on site. Send device latitude and longitude; the server reverse-geocodes a community label when not provided."
  })
  @ApiBody({ type: CreateFieldOutletDto })
  @ApiCreatedResponse({ description: "Vendor created" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  @ApiForbiddenResponse({ description: "Requires promoter role" })
  public createOutlet(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateFieldOutletDto
  ) {
    return this.outletService.createForField(currentUser, body);
  }

  @Post("outlet-visits")
  @ApiOperation({
    operationId: "Me_createOutletVisit",
    summary: "Record a vendor visit",
    description:
      "Creates a vendor visit with GPS, questionnaire, footfall, visibility, and competitor intel."
  })
  @ApiBody({ type: CreateOutletVisitDto })
  @ApiOkResponse({
    description: "Vendor visit recorded",
    schema: {
      example: {
        visit: {
          id: "cmad4p0bo0000iib0i0l9e8wk",
          outletId: "cmad4p0bo0000iib0i0l9e8wk",
          userId: "cmad4p0bo0000iib0i0l9e8wk",
          latitude: 5.6037,
          longitude: -0.187,
          hasOutletPhoto: true,
          isComplete: true,
          checkedInAt: "2026-05-08T18:20:00.000Z"
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public createOutletVisit(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateOutletVisitDto
  ) {
    return this.meService.createOutletVisit(currentUser, body);
  }

  @Get("outlet-visits")
  @ApiOperation({
    operationId: "Me_listOutletVisits",
    summary: "List own outlet visits",
    description: "Returns recent outlet visits for the authenticated field user."
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Maximum rows to return (1-100, default 50)",
    schema: { type: "integer", default: 50, minimum: 1, maximum: 100 }
  })
  @ApiOkResponse({ description: "Outlet visit rows" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT token" })
  public listOutletVisits(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number
  ) {
    return this.outletService.listVisitsForField(currentUser, limit);
  }
}
