import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { OutletCoreModule } from "../outlet/outlet-core.module";
import { PrismaModule } from "../prisma/prisma.module";
import { QuestionnaireAdminController } from "./questionnaire-admin.controller";
import { QuestionnaireRepository } from "./questionnaire.repository";
import { QuestionnaireService } from "./questionnaire.service";

@Module({
  imports: [PrismaModule, AuthModule, OutletCoreModule],
  controllers: [QuestionnaireAdminController],
  providers: [QuestionnaireService, QuestionnaireRepository],
  exports: [QuestionnaireService, QuestionnaireRepository]
})
export class QuestionnaireAdminModule {}
