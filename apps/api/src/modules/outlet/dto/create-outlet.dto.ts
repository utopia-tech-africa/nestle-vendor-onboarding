import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength
} from "class-validator";

import { OutletProfileExtrasDto } from "./outlet-profile-extras.dto";

export class CreateOutletDto extends OutletProfileExtrasDto {
  @ApiProperty({ type: String, example: "Ama's Koko Spot" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  public name!: string;

  @ApiProperty({ type: String, example: "Table top", description: "Parent vendor type from the catalog" })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  public vendorTypeGroup!: string;

  @ApiProperty({ type: String, example: "Koko seller", description: "Seller type (value under the vendor type)" })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  public category!: string;

  @ApiPropertyOptional({ type: String, example: "N/A", default: "N/A" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  public distributorName?: string;

  @ApiPropertyOptional({
    type: String,
    example: "Darkuman",
    description: "Community. Optional when latitude and longitude are provided."
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  public locationArea?: string;

  @ApiPropertyOptional({ type: String, example: "Ablekuma" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  public district?: string;

  @ApiPropertyOptional({ type: String, example: "cmad4p0bo0000iib0i0l9e8wk" })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(40)
  public regionId?: string;

  @ApiPropertyOptional({ type: Number, example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  public yearsInBusiness?: number;

  @ApiPropertyOptional({ type: Number, example: 5.6037 })
  @IsOptional()
  @IsLatitude()
  public latitude?: number;

  @ApiPropertyOptional({ type: Number, example: -0.187 })
  @IsOptional()
  @IsLongitude()
  public longitude?: number;

  @ApiProperty({ type: String, example: "Ama Mensah" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  public contactName!: string;

  @ApiProperty({ type: String, example: "0244123456", description: "Primary phone" })
  @IsString()
  @MinLength(7)
  @MaxLength(40)
  public contactPhone!: string;

  @ApiPropertyOptional({ type: String, example: "vendor@example.com" })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  public contactEmail?: string;

  @ApiPropertyOptional({ type: Boolean, example: true, default: true })
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;
}
