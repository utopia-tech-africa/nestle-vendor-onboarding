import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf
} from "class-validator";

/** PATCH body: `regionId` may be a cuid string or `null` to clear the user's region. */
export class UpdateAdminUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  public fullName?: string;

  @ApiPropertyOptional({
    description: "Email for ops alerts / digests, or null to clear",
    nullable: true,
    example: "ops@example.com"
  })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsEmail()
  @MaxLength(254)
  public email?: string | null;

  @ApiPropertyOptional({ enum: ["promoter", "client", "supervisor", "admin"] })
  @IsOptional()
  @IsIn(["promoter", "client", "supervisor", "admin"])
  public role?: "promoter" | "client" | "supervisor" | "admin";

  @ApiPropertyOptional({
    description: "Region id (cuid), or null to remove region assignment",
    nullable: true
  })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public regionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;

  @ApiPropertyOptional({ enum: ["male", "female", "other"] })
  @IsOptional()
  @IsIn(["male", "female", "other"])
  public gender?: "male" | "female" | "other";

  @ApiPropertyOptional({
    type: [String],
    description: "Replace work-area geofence ids. Empty array clears assignments."
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public geofenceIds?: string[];
}
