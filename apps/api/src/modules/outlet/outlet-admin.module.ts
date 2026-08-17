import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { CatalogAdminController } from "./catalog-admin.controller";
import { OutletController } from "./outlet.controller";
import { OutletCoreModule } from "./outlet-core.module";

@Module({
  imports: [OutletCoreModule, AuthModule],
  controllers: [OutletController, CatalogAdminController]
})
export class OutletAdminModule {}
