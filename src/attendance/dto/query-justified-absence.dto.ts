import { Transform } from 'class-transformer';
import { IsOptional, IsInt, IsPositive, Matches } from 'class-validator';

export class QueryJustifiedAbsenceDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsOptional()
  startDate?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsOptional()
  endDate?: string;

  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt()
  @IsPositive()
  @IsOptional()
  employeeId?: number;
}
