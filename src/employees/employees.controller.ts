import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RestaurantAccessGuard } from '../auth/restaurant-access.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ReorderEmployeesDto } from './dto/reorder-employees.dto';
import { EmployeeResponseDto } from './dto/employee-response.dto';

@UseGuards(JwtAuthGuard, RolesGuard, RestaurantAccessGuard)
@Roles('admin', 'gerente')
@Controller('restaurants/:restaurantId/employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  async findAll(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
  ): Promise<EmployeeResponseDto[]> {
    return this.employeesService.findAll(restaurantId);
  }

  @Post()
  async create(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() createEmployeeDto: CreateEmployeeDto,
  ): Promise<EmployeeResponseDto> {
    return this.employeesService.create(restaurantId, createEmployeeDto);
  }

  // Must be declared before @Patch(':id') — otherwise Nest's router would
  // match "reorder" as the :id param instead of this literal route.
  @Patch('reorder')
  async reorder(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: ReorderEmployeesDto,
  ): Promise<void> {
    return this.employeesService.reorder(restaurantId, dto.ids);
  }

  @Patch(':id')
  async update(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ): Promise<EmployeeResponseDto> {
    return this.employeesService.update(restaurantId, id, updateEmployeeDto);
  }

  @Delete(':id')
  async softDelete(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<EmployeeResponseDto> {
    return this.employeesService.softDelete(restaurantId, id);
  }
}
