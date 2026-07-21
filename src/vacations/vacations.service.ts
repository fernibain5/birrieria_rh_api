import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { RequestUser } from '../auth/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVacationRequestDto } from './dto/create-vacation-request.dto';
import { QueryVacationRequestDto } from './dto/query-vacation-request.dto';
import { VacationRequestDto } from './dto/vacation-request-response.dto';

/** Indexed by Date#getUTCDay() (0 = Sunday .. 6 = Saturday) — matches User.restDays' Spanish names. */
const DIA_BY_JS_DAY = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

@Injectable()
export class VacationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * LFT Art. 76 (2023 "Vacaciones Dignas" reform) day table.
   * Keep in sync with birrieria_rh/src/utils/vacationUtils.ts.
   */
  private vacationDaysForSeniority(years: number): number {
    if (years <= 0) return 0;
    if (years <= 5) return 10 + years * 2;
    const tier = Math.ceil((years - 5) / 5);
    return 20 + tier * 2;
  }

  /** Floor of full years elapsed between `earlier` and `later`, UTC-calendar-date based. */
  private differenceInYears(later: Date, earlier: Date): number {
    let years = later.getUTCFullYear() - earlier.getUTCFullYear();
    const laterMonthDay = later.getUTCMonth() * 100 + later.getUTCDate();
    const earlierMonthDay = earlier.getUTCMonth() * 100 + earlier.getUTCDate();
    if (laterMonthDay < earlierMonthDay) years--;
    return Math.max(0, years);
  }

  private addYears(date: Date, years: number): Date {
    const d = new Date(date);
    d.setUTCFullYear(d.getUTCFullYear() + years);
    return d;
  }

  /**
   * The anniversary-year period a given day falls in, e.g. hireDate
   * 2020-03-15 + today past the 6th anniversary → windowStart 2026-03-15,
   * windowEnd 2027-03-15, completedYears 6. Keep in sync with
   * birrieria_rh/src/utils/vacationUtils.ts's getAnniversaryWindow.
   */
  private getAnniversaryWindow(
    hireDate: Date,
    today: Date,
  ): { windowStart: Date; windowEnd: Date; completedYears: number } {
    const completedYears = this.differenceInYears(today, hireDate);
    const windowStart = this.addYears(hireDate, completedYears);
    const windowEnd = this.addYears(hireDate, completedYears + 1);
    return { windowStart, windowEnd, completedYears };
  }

  /**
   * Business days in [startDate, endDate] (inclusive, "YYYY-MM-DD" strings):
   * excludes the employee's specific restDays (this restaurant runs 6 days/week
   * per employee, not a generic Sat/Sun weekend) and any applicable holiday
   * Event. Server-authoritative — never trust a client-supplied day count.
   */
  private async countBusinessDays(
    user: { restDays: string[]; restaurantId: number | null },
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    const holidayEvents = await this.prisma.event.findMany({
      where: {
        type: 'holiday',
        date: { gte: start, lte: end },
        OR: [
          { targetRestaurantId: null },
          ...(user.restaurantId != null ? [{ targetRestaurantId: user.restaurantId }] : []),
        ],
      },
      select: { date: true },
    });
    const holidaySet = new Set(holidayEvents.map((e) => e.date.toISOString().slice(0, 10)));

    let count = 0;
    for (const d = new Date(start); d.getTime() <= end.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
      const dateKey = d.toISOString().slice(0, 10);
      if (user.restDays.includes(DIA_BY_JS_DAY[d.getUTCDay()])) continue;
      if (holidaySet.has(dateKey)) continue;
      count++;
    }
    return count;
  }

  async create(dto: CreateVacationRequestDto, requestUser: RequestUser): Promise<VacationRequestDto> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }
    if (requestUser.role !== 'admin' && user.restaurantId !== requestUser.restaurantId) {
      throw new ForbiddenException('No puedes gestionar vacaciones de otra sucursal');
    }
    if (!user.hireDate) {
      throw new BadRequestException('El empleado no tiene fecha de ingreso registrada');
    }
    if (dto.startDate > dto.endDate) {
      throw new BadRequestException('La fecha de inicio no puede ser posterior a la fecha de fin');
    }

    const today = new Date();
    const { windowStart, windowEnd, completedYears } = this.getAnniversaryWindow(user.hireDate, today);
    const entitlement = this.vacationDaysForSeniority(completedYears);

    const windowStartKey = windowStart.toISOString().slice(0, 10);
    const windowEndKey = windowEnd.toISOString().slice(0, 10);

    const priorRequests = await this.prisma.vacationRequest.findMany({
      where: {
        userId: dto.userId,
        startDate: { gte: windowStartKey, lt: windowEndKey },
      },
      select: { businessDays: true },
    });
    const used = priorRequests.reduce((sum, r) => sum + r.businessDays, 0);
    const available = entitlement - used;

    const requestedDays = await this.countBusinessDays(user, dto.startDate, dto.endDate);

    if (requestedDays > available) {
      throw new BadRequestException(
        `No hay suficientes días disponibles: solicita ${requestedDays} día${requestedDays !== 1 ? 's' : ''}, quedan ${available} disponible${available !== 1 ? 's' : ''}.`,
      );
    }

    const record = await this.prisma.vacationRequest.create({
      data: {
        userId: dto.userId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        businessDays: requestedDays,
        approvedById: dto.approvedById,
      },
    });
    return VacationRequestDto.from(record);
  }

  async findAll(
    query: QueryVacationRequestDto,
    requestUser: RequestUser,
  ): Promise<VacationRequestDto[]> {
    const restaurantId = requestUser.role === 'admin' ? query.restaurantId : requestUser.restaurantId;
    const records = await this.prisma.vacationRequest.findMany({
      where: restaurantId ? { user: { restaurantId } } : {},
      orderBy: { startDate: 'desc' },
    });
    return records.map(VacationRequestDto.from);
  }
}
