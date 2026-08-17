import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";

export class UpdateLocationDto {
  @ApiProperty({ type: Number, example: -1.286389, description: "Latitude in decimal degrees" })
  @IsLatitude()
  public latitude!: number;

  @ApiProperty({ type: Number, example: 36.817223, description: "Longitude in decimal degrees" })
  @IsLongitude()
  public longitude!: number;

  @ApiPropertyOptional({
    enum: ["clock_in", "clock_out"],
    description: "Attendance event type. Defaults to clock_in when omitted.",
    default: "clock_in"
  })
  @IsOptional()
  @IsIn(["clock_in", "clock_out"])
  public attendanceKind?: "clock_in" | "clock_out";

  @ApiPropertyOptional({
    type: String,
    description:
      "Cloudinary `public_id` from a signed upload (preferred). Required for check-in unless `autoClockOut` or legacy base64 is sent.",
    example: "nestle/attendance/cmad4p0bo0000iib0i0l9e8wk/abc123"
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  public selfieCloudinaryPublicId?: string;

  @ApiPropertyOptional({
    type: String,
    description:
      "Legacy base64 selfie (JPEG or PNG). Used when offline or Cloudinary is not configured; server uploads to Cloudinary when configured.",
    example: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  })
  @IsOptional()
  @IsString()
  @MinLength(80)
  @MaxLength(12_000_000)
  public selfieImageBase64?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      "When true with `attendanceKind: clock_out`, records an automatic clock-out after leaving the work-area radius (no selfie)."
  })
  @IsOptional()
  @IsBoolean()
  public autoClockOut?: boolean;
}
