import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadGatewayException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { HikvisionService } from '../hikvision/hikvision.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeResponseDto } from './dto/employee-response.dto';

/** Random 6-digit numeric PIN for the device keypad. */
function generatePasscode(): string {
  return randomInt(100000, 1000000).toString();
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hikvisionService: HikvisionService,
  ) {}

  async findAll(restaurantId: number): Promise<EmployeeResponseDto[]> {
    const employees = await this.prisma.employee.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { name: 'asc' },
    });
    return employees.map((employee) => EmployeeResponseDto.from(employee));
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

    // Enroll the person on the physical device first — Hikvision requires a
    // PIN ("password") to accept the record, so we generate one here rather
    // than asking the admin to invent one.
    const passcode = generatePasscode();
    try {
      await this.hikvisionService.createPerson(
        restaurant,
        dto.hikvisionId,
        dto.name,
        passcode,
      );
    } catch (error) {
      throw new BadGatewayException(
        `No se pudo dar de alta al empleado en el dispositivo Hikvision: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }

    try {
      const employee = await this.prisma.employee.create({
        data: {
          restaurantId,
          hikvisionId: dto.hikvisionId,
          name: dto.name,
          department: dto.department,
          email: dto.email,
          passcode,
        },
      });
      // Only the creation response carries the passcode — the admin needs it
      // once to relay to the employee; later reads (list/update) omit it.
      return EmployeeResponseDto.from(employee, { includePasscode: true });
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
