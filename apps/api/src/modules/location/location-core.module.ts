import { Module } from "@nestjs/common";

import { ReverseGeocodeService } from "../me/reverse-geocode.service";

@Module({
  providers: [ReverseGeocodeService],
  exports: [ReverseGeocodeService]
})
export class LocationCoreModule {}
