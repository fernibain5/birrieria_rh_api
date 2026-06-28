import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RestaurantResponseDto } from './dto/restaurant-response.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RestaurantResponseDto[]> {
    const restaurants = await this.prisma.restaurant.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return restaurants.map(RestaurantResponseDto.from);
  }

  async findOne(id: number): Promise<RestaurantResponseDto> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) {
      throw new NotFoundException(`Restaurant #${id} not found`);
    }
    return RestaurantResponseDto.from(restaurant);
  }

  async create(dto: CreateRestaurantDto): Promise<RestaurantResponseDto> {
    const restaurant = await this.prisma.restaurant.create({
      data: {
        name: dto.name,
        hikvisionIp: dto.hikvisionIp,
        hikvisionUser: dto.hikvisionUser,
        hikvisionPass: dto.hikvisionPass,
      },
    });
    return RestaurantResponseDto.from(restaurant);
  }

  // Internal use only — returns the full record including hikvisionPass
  async findOneRaw(id: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) {
      throw new NotFoundException(`Restaurant #${id} not found`);
    }
    return restaurant;
  }
}
