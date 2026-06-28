import { IsString, IsNotEmpty, IsIP } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  hikvisionIp: string;

  @IsString()
  @IsNotEmpty()
  hikvisionUser: string;

  @IsString()
  @IsNotEmpty()
  hikvisionPass: string;
}
