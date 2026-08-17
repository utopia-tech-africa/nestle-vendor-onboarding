import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

import {
  AGE_BRACKET_VALUES,
  AVERAGE_DAILY_SALES_BRACKET_VALUES,
  EMPLOYEE_COUNT_BRACKET_VALUES,
  GENDER_VALUES,
  VENDOR_ROLE_VALUES
} from "../field-catalogs";

/** Optional vendor-onboarding fields shared by field and ops create/update DTOs. */
export class OutletProfileExtrasDto {
  @ApiPropertyOptional({ type: String, example: "0200123456", description: "Secondary phone" })
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(40)
  public contactPhoneSecondary?: string;

  @ApiPropertyOptional({ enum: VENDOR_ROLE_VALUES, example: "owner" })
  @IsOptional()
  @IsIn(VENDOR_ROLE_VALUES)
  public vendorRole?: (typeof VENDOR_ROLE_VALUES)[number];

  @ApiPropertyOptional({ enum: GENDER_VALUES, example: "female" })
  @IsOptional()
  @IsIn(GENDER_VALUES)
  public gender?: (typeof GENDER_VALUES)[number];

  @ApiPropertyOptional({ enum: AGE_BRACKET_VALUES, example: "age_25_34" })
  @IsOptional()
  @IsIn(AGE_BRACKET_VALUES)
  public ageBracket?: (typeof AGE_BRACKET_VALUES)[number];

  @ApiPropertyOptional({ enum: EMPLOYEE_COUNT_BRACKET_VALUES, example: "one_two" })
  @IsOptional()
  @IsIn(EMPLOYEE_COUNT_BRACKET_VALUES)
  public employeeCountBracket?: (typeof EMPLOYEE_COUNT_BRACKET_VALUES)[number];

  @ApiPropertyOptional({ enum: AVERAGE_DAILY_SALES_BRACKET_VALUES, example: "from_50_100" })
  @IsOptional()
  @IsIn(AVERAGE_DAILY_SALES_BRACKET_VALUES)
  public averageDailySalesBracket?: (typeof AVERAGE_DAILY_SALES_BRACKET_VALUES)[number];

  @ApiPropertyOptional({ type: String, example: "Opposite the lorry station" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  public landmark?: string;
}
