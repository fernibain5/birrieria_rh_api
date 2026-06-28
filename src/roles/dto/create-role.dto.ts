import { IsString } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  value: string;

  @IsString()
  label: string;

  @IsString()
  color: string;
}
