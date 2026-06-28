import { Employee } from '@prisma/client';

export class EmployeeResponseDto {
  id: number;
  restaurantId: number;
  hikvisionId: string;
  name: string;
  department: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  static from(employee: Employee): EmployeeResponseDto {
    const dto = new EmployeeResponseDto();
    dto.id = employee.id;
    dto.restaurantId = employee.restaurantId;
    dto.hikvisionId = employee.hikvisionId;
    dto.name = employee.name;
    dto.department = employee.department;
    dto.email = employee.email;
    dto.isActive = employee.isActive;
    dto.createdAt = employee.createdAt;
    dto.updatedAt = employee.updatedAt;
    return dto;
  }
}
