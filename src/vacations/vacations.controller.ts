import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestUser } from '../auth/request-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { VacationsService } from './vacations.service';
import { CreateVacationRequestDto } from './dto/create-vacation-request.dto';
import { QueryVacationRequestDto } from './dto/query-vacation-request.dto';
import { VacationRequestDto } from './dto/vacation-request-response.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'gerente')
@Controller('vacations')
export class VacationsController {
  constructor(private readonly vacationsService: VacationsService) {}

  @Get()
  findAll(
    @Query() query: QueryVacationRequestDto,
    @Request() req: { user: RequestUser },
  ): Promise<VacationRequestDto[]> {
    return this.vacationsService.findAll(query, req.user);
  }

  @Post()
  create(
    @Body() dto: CreateVacationRequestDto,
    @Request() req: { user: RequestUser },
  ): Promise<VacationRequestDto> {
    return this.vacationsService.create(dto, req.user);
  }
}
