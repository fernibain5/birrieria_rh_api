import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsISO8601,
  IsInt,
  Min,
  Max,
  IsPositive,
} from 'class-validator';

export class QueryAttendanceDto {
  @IsISO8601()
  @IsOptional()
  startDate?: string;

  @IsISO8601()
  @IsOptional()
  endDate?: string;

  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt()
  @IsPositive()
  @IsOptional()
  employeeId?: number;

  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => (value ? parseInt(value, 10) : 50))
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number = 50;
}
