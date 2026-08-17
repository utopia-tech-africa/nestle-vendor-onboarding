import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from "class-validator";

export enum QuestionTypeDto {
  text = "text",
  textarea = "textarea",
  number = "number",
  single_choice = "single_choice",
  multi_choice = "multi_choice",
  boolean = "boolean"
}

export class CreateQuestionnaireQuestionDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  public prompt!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public helpText?: string;

  @ApiPropertyOptional({ enum: QuestionTypeDto, default: QuestionTypeDto.text })
  @IsOptional()
  @IsEnum(QuestionTypeDto)
  public type?: QuestionTypeDto;

  @ApiPropertyOptional({
    type: [String],
    description: "Choice labels for single_choice / multi_choice"
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public options?: string[];

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  public required?: boolean;

  @ApiPropertyOptional({ type: Number, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  public sortOrder?: number;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;
}

export class CreateQuestionnaireDto {
  @ApiProperty({ type: String, example: "Vendor market questionnaire" })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  public title!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public description?: string;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;

  @ApiPropertyOptional({ type: [CreateQuestionnaireQuestionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionnaireQuestionDto)
  public questions?: CreateQuestionnaireQuestionDto[];
}

export class UpdateQuestionnaireDto extends PartialType(CreateQuestionnaireDto) {}
