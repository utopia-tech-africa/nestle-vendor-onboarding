import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class IssueOutletItemDto {
  @ApiPropertyOptional({ type: String, example: "Given at Darkuman activation" })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  public notes?: string;
}
