import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../email/email.module";
import { PrismaModule } from "../prisma/prisma.module";
import { NestleDashboardController } from "./nestle-dashboard.controller";
import { OpsAlertAdminController, OpsAlertFieldController } from "./ops-alert.controller";
import { OpsAlertService } from "./ops-alert.service";

@Module({
  imports: [PrismaModule, AuthModule, EmailModule],
  controllers: [OpsAlertAdminController, OpsAlertFieldController, NestleDashboardController],
  providers: [OpsAlertService],
  exports: [OpsAlertService]
})
export class OpsAlertModule {}
