import { VacationRequest } from '@prisma/client';

export class VacationRequestDto {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  businessDays: number;
  approvedById: string | null;
  createdAt: Date;

  static from(record: VacationRequest): VacationRequestDto {
    const dto = new VacationRequestDto();
    dto.id = record.id;
    dto.userId = record.userId;
    dto.startDate = record.startDate;
    dto.endDate = record.endDate;
    dto.businessDays = record.businessDays;
    dto.approvedById = record.approvedById;
    dto.createdAt = record.createdAt;
    return dto;
  }
}
