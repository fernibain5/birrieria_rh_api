import { Transform } from 'class-transformer';
import { IsOptional, IsInt, IsPositive } from 'class-validator';

export class QueryVacationRequestDto {
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt()
  @IsPositive()
  @IsOptional()
  restaurantId?: number;
}
