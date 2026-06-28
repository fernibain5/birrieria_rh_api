import { IsString, IsOptional, IsDateString, IsNumber } from 'class-validator';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  targetRole?: string;

  @IsOptional()
  @IsString()
  targetBranch?: string;

  @IsOptional()
  @IsString()
  minutaId?: string;
}
