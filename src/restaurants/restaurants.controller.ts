import { Controller, Get, Post, Body } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RestaurantResponseDto } from './dto/restaurant-response.dto';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  async findAll(): Promise<RestaurantResponseDto[]> {
    return this.restaurantsService.findAll();
  }

  @Post()
  async create(
    @Body() createRestaurantDto: CreateRestaurantDto,
  ): Promise<RestaurantResponseDto> {
    return this.restaurantsService.create(createRestaurantDto);
  }
}
