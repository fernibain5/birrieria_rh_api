import { Employee } from '@prisma/client';

type EmployeeWithUser = Employee & {
  user?: { id: string; displayName: string | null; restDay: string; hireDate: Date | null } | null;
};

export class LinkedUserDto {
  id: string;
  displayName: string | null;
  restDay: string;
  hireDate: Date | null;
}

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
  /** Admin-defined display order, shared across all Incidencias reports. */
  sortOrder: number;
  /** Only populated right after creation, so the admin can relay it once. */
  passcode?: string;
  /** The website account linked to this Hikvision employee, if any. */
  linkedUser?: LinkedUserDto | null;

  static from(
    employee: EmployeeWithUser,
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
    dto.sortOrder = employee.sortOrder;
    if (opts?.includePasscode) dto.passcode = employee.passcode ?? undefined;
    dto.linkedUser = employee.user
      ? {
          id: employee.user.id,
          displayName: employee.user.displayName,
          restDay: employee.user.restDay,
          hireDate: employee.user.hireDate,
        }
      : null;
    return dto;
  }
}
