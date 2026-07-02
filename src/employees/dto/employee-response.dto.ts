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
  /** Only populated right after creation, so the admin can relay it once. */
  passcode?: string;

  static from(
    employee: Employee,
    opts?: { includePasscode?: boolean },
  ): EmployeeResponseDto {
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
    if (opts?.includePasscode) dto.passcode = employee.passcode ?? undefined;
    return dto;
  }
}
