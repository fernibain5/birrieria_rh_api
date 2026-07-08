import { IsInt, IsPositive, IsString, IsOptional, Matches } from 'class-validator';

export class CreateJustifiedAbsenceDto {
  @IsInt()
  @IsPositive()
  employeeId: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @IsString()
  @IsOptional()
  justifiedById?: string;
}
