import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
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
import { CreateQuestionnaireDto, UpdateQuestionnaireDto } from "./dto/questionnaire.dto";
import { QuestionnaireService } from "./questionnaire.service";

@Controller("admin/questionnaires")
@ApiTags("Admin questionnaires")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class QuestionnaireAdminController {
  public constructor(
    @Inject(QuestionnaireService) private readonly questionnaireService: QuestionnaireService
  ) {}

  @Get()
  @ApiOperation({ operationId: "AdminQuestionnaire_list", summary: "List questionnaires" })
  @ApiOkResponse({ description: "Questionnaires with questions" })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  public list(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.questionnaireService.listForAdmin(currentUser);
  }

  @Post()
  @ApiOperation({ operationId: "AdminQuestionnaire_create", summary: "Create questionnaire" })
  @ApiBody({ type: CreateQuestionnaireDto })
  @ApiCreatedResponse()
  public create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateQuestionnaireDto
  ) {
    return this.questionnaireService.createForAdmin(currentUser, body);
  }

  @Post("seed-default")
  @ApiOperation({
    operationId: "AdminQuestionnaire_seedDefault",
    summary: "Create or refresh the default Nestlé vendor questionnaire"
  })
  @ApiCreatedResponse()
  public seed(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.questionnaireService.seedDefaultIfEmpty(currentUser);
  }

  @Patch(":id")
  @ApiParam({ name: "id" })
  @ApiOperation({ operationId: "AdminQuestionnaire_update", summary: "Update questionnaire" })
  @ApiBody({ type: UpdateQuestionnaireDto })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  public update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpdateQuestionnaireDto
  ) {
    return this.questionnaireService.updateForAdmin(currentUser, id, body);
  }
}
