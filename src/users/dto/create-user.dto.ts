import { IsEmail, IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export const DIAS_DESCANSO = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  displayName: string;

  @IsString()
  role: string;

  @IsString()
  branch: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsString()
  @IsIn(DIAS_DESCANSO)
  restDay: string;
}
