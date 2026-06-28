import { Restaurant } from '@prisma/client';

export class RestaurantResponseDto {
  id: number;
  name: string;
  hikvisionIp: string;
  hikvisionUser: string;
  // hikvisionPass is intentionally omitted
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  static from(restaurant: Restaurant): RestaurantResponseDto {
    const dto = new RestaurantResponseDto();
    dto.id = restaurant.id;
    dto.name = restaurant.name;
    dto.hikvisionIp = restaurant.hikvisionIp;
    dto.hikvisionUser = restaurant.hikvisionUser;
    dto.isActive = restaurant.isActive;
    dto.createdAt = restaurant.createdAt;
    dto.updatedAt = restaurant.updatedAt;
    return dto;
  }
}
