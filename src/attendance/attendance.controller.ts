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
  ): Promise<SyncResultDto> {
    return this.attendanceService.sync(restaurantId);
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
