import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeResponseDto } from './dto/employee-response.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(restaurantId: number): Promise<EmployeeResponseDto[]> {
    const employees = await this.prisma.employee.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { name: 'asc' },
    });
    return employees.map(EmployeeResponseDto.from);
  }

  async create(
    restaurantId: number,
    dto: CreateEmployeeDto,
  ): Promise<EmployeeResponseDto> {
    // Verify the restaurant exists
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException(`Restaurant #${restaurantId} not found`);
    }

    try {
      const employee = await this.prisma.employee.create({
        data: {
          restaurantId,
          hikvisionId: dto.hikvisionId,
          name: dto.name,
          department: dto.department,
          email: dto.email,
        },
      });
      return EmployeeResponseDto.from(employee);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          `Employee with hikvisionId "${dto.hikvisionId}" already exists in this restaurant`,
        );
      }
      throw error;
    }
  }

  async update(
    restaurantId: number,
    employeeId: number,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeeResponseDto> {
    await this.findOneOrThrow(restaurantId, employeeId);

    const employee = await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.hikvisionId !== undefined && { hikvisionId: dto.hikvisionId }),
        ...(dto.department !== undefined && { department: dto.department }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
    });
    return EmployeeResponseDto.from(employee);
  }

  async softDelete(
    restaurantId: number,
    employeeId: number,
  ): Promise<EmployeeResponseDto> {
    await this.findOneOrThrow(restaurantId, employeeId);

    const employee = await this.prisma.employee.update({
      where: { id: employeeId },
      data: { isActive: false },
    });
    return EmployeeResponseDto.from(employee);
  }

  private async findOneOrThrow(restaurantId: number, employeeId: number) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, restaurantId },
    });
    if (!employee) {
      throw new NotFoundException(
        `Employee #${employeeId} not found in restaurant #${restaurantId}`,
      );
    }
    return employee;
  }
}
