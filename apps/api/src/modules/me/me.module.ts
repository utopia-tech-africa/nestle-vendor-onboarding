import { Module } from "@nestjs/common";

import { GeofenceCoreModule } from "../geofence/geofence-core.module";
import { LocationCoreModule } from "../location/location-core.module";
import { OutletCoreModule } from "../outlet/outlet-core.module";
import { QuestionnaireAdminModule } from "../questionnaire/questionnaire-admin.module";
import { OpsAlertModule } from "../ops-alert/ops-alert.module";
import { TrackingModule } from "../tracking/tracking.module";
import { MeController } from "./me.controller";
import { MeRepository } from "./me.repository";
import { MeService } from "./me.service";

@Module({
  imports: [
    GeofenceCoreModule,
    OutletCoreModule,
    TrackingModule,
    LocationCoreModule,
    QuestionnaireAdminModule,
    OpsAlertModule
  ],
  controllers: [MeController],
  providers: [MeService, MeRepository]
})
export class MeModule {}
