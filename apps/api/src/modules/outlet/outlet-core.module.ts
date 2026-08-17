import { Module } from "@nestjs/common";

import { LocationCoreModule } from "../location/location-core.module";
import { OpsAlertModule } from "../ops-alert/ops-alert.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SmsModule } from "../sms/sms.module";
import { CatalogRepository } from "./catalog.repository";
import { CatalogService } from "./catalog.service";
import { OutletRepository } from "./outlet.repository";
import { OutletService } from "./outlet.service";

@Module({
  imports: [PrismaModule, LocationCoreModule, OpsAlertModule, SmsModule],
  providers: [OutletService, OutletRepository, CatalogService, CatalogRepository],
  exports: [OutletService, OutletRepository, CatalogService]
})
export class OutletCoreModule {}
