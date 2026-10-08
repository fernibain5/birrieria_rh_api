import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestUser } from '../auth/request-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

const SUBGERENTE_ROLE = 'subgerente';

@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(@Query('year') year: string | undefined, @Request() req: { user: RequestUser }) {
    return this.eventsService.findAll(year ? Number(year) : undefined, req.user);
  }

  @Get('holidays/check')
  checkHolidays(
    @Query('year') year: string,
    @Query('branch') branch: string,
  ) {
    return this.eventsService.checkHolidaysExist(Number(year), branch);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'gerente', SUBGERENTE_ROLE)
  @Post()
  create(@Body() dto: CreateEventDto, @Request() req: { user: RequestUser }) {
    return this.eventsService.create(dto, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'gerente')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @Request() req: { user: RequestUser },
  ) {
    return this.eventsService.update(id, dto, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'gerente')
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: RequestUser }) {
    return this.eventsService.remove(id, req.user);
  }
}
