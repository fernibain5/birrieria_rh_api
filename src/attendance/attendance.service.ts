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
    const syncStart = new Date();
    let recordCount = 0;

    // Fetch restaurant (with device credentials)
    const restaurant = await this.restaurantsService.findOneRaw(restaurantId);

    // Determine sync window: from last successful sync or 30 days ago
    const lastSync = await this.prisma.syncLog.findFirst({
      where: { restaurantId, status: 'success' },
      orderBy: { endTime: 'desc' },
    });

    const syncFrom = lastSync
      ? lastSync.endTime
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const syncTo = new Date();

    try {
      this.logger.log(
        `Starting sync for restaurant #${restaurantId} | from: ${syncFrom.toISOString()}`,
      );

      const events = await this.hikvisionService.fetchEvents(
        restaurant,
        syncFrom,
        syncTo,
      );

      // For each event: find matching employee and upsert the attendance record
      for (const event of events) {
        const employee = await this.prisma.employee.findUnique({
          where: {
            restaurantId_hikvisionId: {
              restaurantId,
              hikvisionId: event.hikvisionId,
            },
          },
        });

        if (!employee) {
          this.logger.warn(
            `No employee found for hikvisionId="${event.hikvisionId}" in restaurant #${restaurantId} — skipping`,
          );
          continue;
        }

        await this.prisma.attendanceRecord.upsert({
          where: {
            employeeId_checkedAt: {
              employeeId: employee.id,
              checkedAt: event.checkedAt,
            },
          },
          update: {}, // Already exists — nothing to update
          create: {
            employeeId: employee.id,
            checkedAt: event.checkedAt,
            eventType: event.eventType,
            deviceIp: event.deviceIp,
            rawData: event.rawData as object,
          },
        });

        recordCount++;
      }

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
        `Sync completed for restaurant #${restaurantId}: ${recordCount} records`,
      );

      return {
        restaurantId,
        status: 'success',
        recordsSynced: recordCount,
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
