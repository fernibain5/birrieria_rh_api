import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { HikvisionService } from '../hikvision/hikvision.service';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import {
  AttendanceRecordDto,
  PaginatedAttendanceDto,
  SyncResultDto,
} from './dto/attendance-response.dto';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurantsService: RestaurantsService,
    private readonly hikvisionService: HikvisionService,
  ) {}

  async findAll(
    restaurantId: number,
    query: QueryAttendanceDto,
  ): Promise<PaginatedAttendanceDto> {
    const { startDate, endDate, employeeId, page = 1, limit = 50 } = query;

    const where = {
      employee: { restaurantId },
      ...(startDate && { checkedAt: { gte: new Date(startDate) } }),
      ...(endDate && {
        checkedAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          lte: new Date(endDate),
        },
      }),
      ...(employeeId && { employeeId }),
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.attendanceRecord.findMany({
        where,
        include: { employee: true },
        orderBy: { checkedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

    return {
      data: records.map(AttendanceRecordDto.from),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async sync(restaurantId: number): Promise<SyncResultDto> {
    // Fetch restaurant (with device credentials)
    const restaurant = await this.restaurantsService.findOneRaw(restaurantId);

    if (!restaurant.hikvisionIp) {
      return {
        restaurantId,
        status: 'error',
        recordsSynced: 0,
        errorMessage: 'Dispositivo no configurado para esta sucursal',
        syncedAt: new Date(),
      };
    }

    // Fixed 30-day lookback: re-fetching already-synced events is safe and
    // cheap (bulk createMany + skipDuplicates below), and it self-heals gaps —
    // e.g. events skipped while their employee wasn't imported yet.
    const syncFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const syncTo = new Date();

    let employeesImported = 0;
    let importError: string | undefined;

    try {
      this.logger.log(
        `Starting sync for restaurant #${restaurantId} | from: ${syncFrom.toISOString()}`,
      );

      // Import persons enrolled directly on the device screen so their punches
      // match an Employee row below. Create-only (skipDuplicates): names and
      // departments edited in the app are never overwritten. A failure here
      // must not block event syncing for already-known employees, but it is
      // surfaced in the response so the UI can show it.
      try {
        const persons = await this.hikvisionService.fetchPersons(restaurant);
        if (persons.length > 0) {
          const created = await this.prisma.employee.createMany({
            data: persons.map((p) => ({
              restaurantId,
              hikvisionId: p.hikvisionId,
              name: p.name,
            })),
            skipDuplicates: true,
          });
          employeesImported = created.count;
          if (created.count > 0) {
            this.logger.log(
              `Imported ${created.count} new employee(s) from device for restaurant #${restaurantId}`,
            );
          }
        }
      } catch (error) {
        importError = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Person import failed for restaurant #${restaurantId}: ${importError} — continuing with event sync`,
        );
      }

      const events = await this.hikvisionService.fetchEvents(
        restaurant,
        syncFrom,
        syncTo,
      );

      const employees = await this.prisma.employee.findMany({
        where: { restaurantId },
        select: { id: true, hikvisionId: true },
      });
      const employeeIdByHikvisionId = new Map(
        employees.map((e) => [e.hikvisionId, e.id]),
      );

      const unmatchedIds = new Set<string>();
      const recordsToCreate: {
        employeeId: number;
        checkedAt: Date;
        eventType: string;
        deviceIp: string;
        rawData: object;
      }[] = [];

      for (const event of events) {
        const employeeId = employeeIdByHikvisionId.get(event.hikvisionId);
        if (employeeId === undefined) {
          unmatchedIds.add(event.hikvisionId);
          continue;
        }
        recordsToCreate.push({
          employeeId,
          checkedAt: event.checkedAt,
          eventType: event.eventType,
          deviceIp: event.deviceIp,
          rawData: event.rawData as object,
        });
      }

      if (unmatchedIds.size > 0) {
        this.logger.warn(
          `${events.length - recordsToCreate.length} event(s) skipped for restaurant #${restaurantId} — no employee for hikvisionId(s): ${[...unmatchedIds].join(', ')}`,
        );
      }

      const created =
        recordsToCreate.length > 0
          ? await this.prisma.attendanceRecord.createMany({
              data: recordsToCreate,
              skipDuplicates: true,
            })
          : { count: 0 };
      const recordCount = created.count;
      const eventsSkipped = events.length - recordsToCreate.length;

      // Log success
      await this.prisma.syncLog.create({
        data: {
          restaurantId,
          startTime: syncFrom,
          endTime: syncTo,
          recordCount,
          status: 'success',
        },
      });

      this.logger.log(
        `Sync completed for restaurant #${restaurantId}: ${recordCount} new record(s), ${employeesImported} employee(s) imported, ${eventsSkipped} event(s) skipped`,
      );

      return {
        restaurantId,
        status: 'success',
        recordsSynced: recordCount,
        employeesImported,
        eventsSkipped,
        importError,
        syncedAt: syncTo,
      };
    } catch (error) {
      const errorMsg: string =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Sync failed for restaurant #${restaurantId}: ${errorMsg}`,
      );

      // Log error (do not expose credentials or internal paths)
      await this.prisma.syncLog.create({
        data: {
          restaurantId,
          startTime: syncFrom,
          endTime: syncTo,
          recordCount: 0,
          status: 'error',
          errorMsg: errorMsg.substring(0, 500),
        },
      });

      return {
        restaurantId,
        status: 'error',
        recordsSynced: 0,
        errorMessage: 'Sync failed — check server logs for details',
        syncedAt: syncTo,
      };
    }
  }

  async downloadCsv(
    restaurantId: number,
    query: Omit<QueryAttendanceDto, 'page' | 'limit'>,
  ): Promise<string> {
    // Verify restaurant exists
    await this.restaurantsService.findOne(restaurantId);

    const { startDate, endDate, employeeId } = query;

    const where = {
      employee: { restaurantId },
      ...(startDate && { checkedAt: { gte: new Date(startDate) } }),
      ...(endDate && {
        checkedAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          lte: new Date(endDate),
        },
      }),
      ...(employeeId && { employeeId }),
    };

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: { employee: true },
      orderBy: [{ employee: { name: 'asc' } }, { checkedAt: 'asc' }],
    });

    const header =
      'Employee ID,Hikvision ID,Name,Department,Date,Time,Event Type\n';

    const rows = records.map((r) => {
      const date = r.checkedAt.toISOString().split('T')[0];
      const time = r.checkedAt.toISOString().split('T')[1].replace('Z', '');
      const dept = r.employee.department ?? '';
      return `${r.employee.id},${r.employee.hikvisionId},"${r.employee.name}","${dept}",${date},${time},${r.eventType}`;
    });

    return header + rows.join('\n');
  }
}
