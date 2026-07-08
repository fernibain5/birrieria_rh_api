import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestUser } from '../auth/request-user';
import { CreateMinutaDto } from './dto/create-minuta.dto';
import { MinutasService } from './minutas.service';

@UseGuards(JwtAuthGuard)
@Controller('minutas')
export class MinutasController {
  constructor(private readonly minutasService: MinutasService) {}

  @Get()
  findAll(
    @Query('role') role: string | undefined,
    @Query('branch') branch: string | undefined,
    @Request() req: { user: RequestUser },
  ) {
    return this.minutasService.findAll(role, branch, req.user);
  }

  @Post()
  create(@Body() dto: CreateMinutaDto, @Request() req: { user: RequestUser }) {
    return this.minutasService.create(dto, req.user);
  }

  @Patch(':id/areas/:index/complete')
  completeArea(
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number,
    @Request() req: any,
  ) {
    return this.minutasService.completeArea(id, index, req.user);
  }
}
