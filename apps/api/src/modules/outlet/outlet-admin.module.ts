import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { CatalogAdminController } from "./catalog-admin.controller";
import { DistributionController } from "./distribution.controller";
import { OutletController } from "./outlet.controller";
import { OutletCoreModule } from "./outlet-core.module";

@Module({
  imports: [OutletCoreModule, AuthModule],
  controllers: [OutletController, CatalogAdminController, DistributionController]
})
export class OutletAdminModule {}
