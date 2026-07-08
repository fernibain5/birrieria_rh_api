import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RestaurantAccessGuard } from '../auth/restaurant-access.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AttendanceService } from './attendance.service';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { CreateJustifiedAbsenceDto } from './dto/create-justified-absence.dto';
import { QueryJustifiedAbsenceDto } from './dto/query-justified-absence.dto';
import {
  PaginatedAttendanceDto,
  SyncResultDto,
  JustifiedAbsenceDto,
} from './dto/attendance-response.dto';

@UseGuards(JwtAuthGuard, RolesGuard, RestaurantAccessGuard)
@Roles('admin', 'gerente')
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

  @Post('justify')
  async justify(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: CreateJustifiedAbsenceDto,
  ): Promise<JustifiedAbsenceDto> {
    return this.attendanceService.justifyAbsence(restaurantId, dto);
  }

  @Get('justified')
  async justified(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Query() query: QueryJustifiedAbsenceDto,
  ): Promise<JustifiedAbsenceDto[]> {
    return this.attendanceService.findJustified(restaurantId, query);
  }
}
