import { IsString, IsOptional, IsArray, IsDateString } from 'class-validator';

export class CreateMinutaDto {
  @IsString()
  createdBy: string;

  @IsOptional()
  @IsString()
  supervisor?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  whatHappened?: string;

  @IsOptional()
  @IsString()
  expectations?: string;

  @IsOptional()
  @IsDateString()
  nextMeetingDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  responsibleUids?: string[];

  @IsOptional()
  generalInfo?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  areas?: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  attendees?: Record<string, unknown>[];
}
