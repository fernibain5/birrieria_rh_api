import { IsString, IsOptional, Matches } from 'class-validator';

export class CreateVacationRequestDto {
  @IsString()
  userId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be YYYY-MM-DD' })
  startDate: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be YYYY-MM-DD' })
  endDate: string;

  @IsOptional()
  @IsString()
  approvedById?: string;
}
