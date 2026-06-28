import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeResponseDto } from './dto/employee-response.dto';

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
