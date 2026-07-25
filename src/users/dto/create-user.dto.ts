import { IsEmail, IsString, IsOptional, IsDateString, IsIn, IsArray, ArrayMinSize } from 'class-validator';

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
  lastName: string;

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

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(DIAS_DESCANSO, { each: true })
  restDays: string[];
}
