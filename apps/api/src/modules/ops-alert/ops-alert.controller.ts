import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OpsAlertService } from "./ops-alert.service";

class ReportSyncFailureDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public message?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsInt()
  @Min(0)
  public pendingCount?: number;
}

@Controller("admin/alerts")
@ApiTags("Admin alerts")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class OpsAlertAdminController {
  public constructor(@Inject(OpsAlertService) private readonly opsAlertService: OpsAlertService) {}

  @Get()
  @ApiOperation({ operationId: "AdminAlert_list", summary: "List ops alerts" })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  public list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("limit") limit?: string
  ) {
    const parsed = limit !== undefined ? Number(limit) : 100;
    return this.opsAlertService.listForAdmin(
      currentUser,
      Number.isFinite(parsed) ? parsed : 100
    );
  }

  @Patch(":id/read")
  @ApiParam({ name: "id", description: "Alert id (cuid)" })
  @ApiOperation({ operationId: "AdminAlert_markRead", summary: "Mark alert read" })
  public markRead(@CurrentUser() currentUser: AuthenticatedUser, @Param("id") id: string) {
    return this.opsAlertService.markRead(currentUser, id);
  }

  @Post("mark-all-read")
  @ApiOperation({ operationId: "AdminAlert_markAllRead", summary: "Mark all alerts read" })
  public markAllRead(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.opsAlertService.markAllRead(currentUser);
  }
}

@Controller("me")
@ApiTags("Me")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class OpsAlertFieldController {
  public constructor(@Inject(OpsAlertService) private readonly opsAlertService: OpsAlertService) {}

  @Post("sync-failures")
  @ApiOperation({
    operationId: "Me_reportSyncFailure",
    summary: "Report offline sync failure to ops"
  })
  public report(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: ReportSyncFailureDto
  ) {
    return this.opsAlertService.reportSyncFailure(currentUser, body);
  }
}
