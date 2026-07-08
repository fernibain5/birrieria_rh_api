import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsIn,
  ValidateIf,
  MinLength,
} from 'class-validator';
import { DIAS_DESCANSO } from './create-user.dto';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(DIAS_DESCANSO)
  restDay?: string;

  // Links this login account to a Hikvision Employee record; pass null to unlink.
  @IsOptional()
  @ValidateIf((o) => o.employeeId !== null)
  @IsInt()
  employeeId?: number | null;
}
