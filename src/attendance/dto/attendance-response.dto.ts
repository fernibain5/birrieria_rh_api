import { AttendanceRecord, Employee } from '@prisma/client';

type RecordWithEmployee = AttendanceRecord & { employee: Employee };

export class AttendanceRecordDto {
  id: number;
  employeeId: number;
  employeeName: string;
  hikvisionId: string;
  department: string | null;
  checkedAt: Date;
  eventType: string;
  deviceIp: string | null;

  static from(record: RecordWithEmployee): AttendanceRecordDto {
    const dto = new AttendanceRecordDto();
    dto.id = record.id;
    dto.employeeId = record.employeeId;
    dto.employeeName = record.employee.name;
    dto.hikvisionId = record.employee.hikvisionId;
    dto.department = record.employee.department;
    dto.checkedAt = record.checkedAt;
    dto.eventType = record.eventType;
    dto.deviceIp = record.deviceIp;
    return dto;
  }
}

export class PaginatedAttendanceDto {
  data: AttendanceRecordDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SyncResultDto {
  restaurantId: number;
  status: 'success' | 'error';
  recordsSynced: number;
  errorMessage?: string;
  syncedAt: Date;
}
