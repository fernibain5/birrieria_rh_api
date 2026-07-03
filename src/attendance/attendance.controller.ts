import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AttendanceService } from './attendance.service';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import {
  PaginatedAttendanceDto,
  SyncResultDto,
} from './dto/attendance-response.dto';

@Controller('restaurants/:restaurantId/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  async findAll(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Query() query: QueryAttendanceDto,
  ): Promise<PaginatedAttendanceDto> {
    return this.attendanceService.findAll(restaurantId, query);
  }

  @Get('sync')
  async sync(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Query('days') days?: string,
  ): Promise<SyncResultDto> {
    // Parsed by hand: ParseIntPipe({ optional: true }) still rejects the
    // empty value this route receives in production when ?days is omitted.
    const lookbackDays = Number(days);
    return this.attendanceService.sync(
      restaurantId,
      Number.isFinite(lookbackDays) && days !== '' ? lookbackDays : undefined,
    );
  }

  @Get('download')
  async download(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Query() query: QueryAttendanceDto,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.attendanceService.downloadCsv(restaurantId, query);
    const today = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="attendance_${today}.csv"`,
    );
    res.send(csv);
  }
}
