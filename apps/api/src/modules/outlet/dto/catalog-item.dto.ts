import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateCatalogItemDto {
  @ApiProperty({ type: String, example: "Milo" })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  public name!: string;

  @ApiPropertyOptional({ type: Number, example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  public sortOrder?: number;

  @ApiPropertyOptional({ type: Boolean, example: true })
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;
}

export class UpdateCatalogItemDto {
  @ApiPropertyOptional({ type: String, example: "Milo" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  public name?: string;

  @ApiPropertyOptional({ type: Number, example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  public sortOrder?: number;

  @ApiPropertyOptional({ type: Boolean, example: true })
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;
}
