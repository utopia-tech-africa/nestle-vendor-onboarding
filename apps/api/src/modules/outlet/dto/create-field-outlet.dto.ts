import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from "class-validator";

import { OutletVisitPhotoInputDto } from "../../me/dto/create-outlet-visit.dto";
import { OutletProfileExtrasDto } from "./outlet-profile-extras.dto";

export class CreateFieldOutletDto extends OutletProfileExtrasDto {
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

  @ApiProperty({
    type: Number,
    example: 5.6037,
    description: "Device latitude when the promoter created the vendor on site."
  })
  @IsLatitude()
  public latitude!: number;

  @ApiProperty({
    type: Number,
    example: -0.187,
    description: "Device longitude when the promoter created the vendor on site."
  })
  @IsLongitude()
  public longitude!: number;

  @ApiProperty({ type: String, example: "Ama Mensah", description: "Vendor contact name" })
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

  @ApiPropertyOptional({ type: String, example: "cmad4p0bo0000iib0i0l9e8wk" })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(40)
  public regionId?: string;

  @ApiPropertyOptional({ type: String, example: "Ablekuma", description: "District" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  public district?: string;

  @ApiPropertyOptional({
    type: String,
    example: "Darkuman",
    description: "Community (overrides reverse-geocode label when set)"
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  public locationArea?: string;

  @ApiPropertyOptional({ type: Number, example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  public yearsInBusiness?: number;

  @ApiPropertyOptional({
    type: [OutletVisitPhotoInputDto],
    description: "Optional onboarding photos (camera): vendor, shop, product display, shelf, branding, competitor."
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutletVisitPhotoInputDto)
  public photos?: OutletVisitPhotoInputDto[];
}
