import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from "class-validator";

export enum VisitPhotoCategoryDto {
  vendor = "vendor",
  shop = "shop",
  product_display = "product_display",
  shelf_visibility = "shelf_visibility",
  branding = "branding",
  competitor = "competitor"
}

export enum TrafficCategoryDto {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}

export class OutletVisitPhotoInputDto {
  @ApiProperty({ enum: VisitPhotoCategoryDto })
  @IsEnum(VisitPhotoCategoryDto)
  public category!: VisitPhotoCategoryDto;

  @ApiPropertyOptional({ type: String, description: "Cloudinary public_id (preferred)" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  public cloudinaryPublicId?: string;

  @ApiPropertyOptional({ type: String, description: "data URL or base64 JPEG (offline)" })
  @IsOptional()
  @IsString()
  public photoBase64?: string;
}

export class CompetitorObservationInputDto {
  @ApiProperty({ type: String, example: "Ovaltine" })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  public brandName!: string;

  @ApiPropertyOptional({ type: String, example: "Local mix", description: "Required when brand is Other" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  public brandNameOther?: string;

  @ApiPropertyOptional({ type: [String], example: ["Ovaltine powder"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  public products?: string[];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public pricingNotes?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public promotionsNotes?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public discountsNotes?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public newLaunchesNotes?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public displayQualityNotes?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public marketObservations?: string;
}

export class QuestionnaireAnswerInputDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(10)
  public questionId!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  public valueText?: string;
}

export class QuestionnaireResponseInputDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(10)
  public questionnaireId!: string;

  @ApiProperty({ type: [QuestionnaireAnswerInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionnaireAnswerInputDto)
  public answers!: QuestionnaireAnswerInputDto[];
}

export class CreateOutletVisitDto {
  @ApiProperty({ type: String, example: "cmad4p0bo0000iib0i0l9e8wk" })
  @IsString()
  @MinLength(10)
  public outletId!: string;

  @ApiProperty({ type: Number, example: 5.6037 })
  @IsNumber()
  public latitude!: number;

  @ApiProperty({ type: Number, example: -0.187 })
  @IsNumber()
  public longitude!: number;

  @ApiPropertyOptional({
    type: String,
    description: "Cloudinary `public_id` from signed upload (legacy single photo)."
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  public outletPhotoCloudinaryPublicId?: string;

  @ApiPropertyOptional({
    type: String,
    description: "Optional legacy outlet photo in base64."
  })
  @IsOptional()
  @IsString()
  public outletPhotoBase64?: string;

  @ApiPropertyOptional({ type: [OutletVisitPhotoInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutletVisitPhotoInputDto)
  public photos?: OutletVisitPhotoInputDto[];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public stockAvailabilityNotes?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public consumerEngagementNotes?: string;

  @ApiPropertyOptional({ type: Number, example: 80 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  public footfallEstimated?: number;

  @ApiPropertyOptional({ type: String, example: "Morning, Lunch" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  public footfallPeakPeriods?: string;

  @ApiPropertyOptional({ enum: TrafficCategoryDto })
  @IsOptional()
  @IsEnum(TrafficCategoryDto)
  public trafficCategory?: TrafficCategoryDto;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  public footfallManualCount?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  public nestleProductAvailable?: boolean;

  @ApiPropertyOptional({ type: [String], example: ["Milo", "Maggi"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  public nestleProducts?: string[];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public productPlacementNotes?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public shelfVisibilityNotes?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  public posMaterialsPresent?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  public promotionalMaterialsPresent?: boolean;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public stockLevelNotes?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  public outOfStock?: boolean;

  @ApiPropertyOptional({ type: [CompetitorObservationInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompetitorObservationInputDto)
  public competitors?: CompetitorObservationInputDto[];

  @ApiPropertyOptional({ type: QuestionnaireResponseInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuestionnaireResponseInputDto)
  public questionnaire?: QuestionnaireResponseInputDto;
}
