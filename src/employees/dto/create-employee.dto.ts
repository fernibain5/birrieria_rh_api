import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  hikvisionId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
