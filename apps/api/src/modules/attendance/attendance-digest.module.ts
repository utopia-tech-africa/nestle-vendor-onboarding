import { Module } from "@nestjs/common";

import { EmailModule } from "../email/email.module";
import { OpsAlertModule } from "../ops-alert/ops-alert.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AttendanceAdminModule } from "./attendance-admin.module";
import { AttendanceDigestService } from "./attendance-digest.service";

@Module({
  imports: [PrismaModule, EmailModule, AttendanceAdminModule, OpsAlertModule],
  providers: [AttendanceDigestService]
})
export class AttendanceDigestModule {}
