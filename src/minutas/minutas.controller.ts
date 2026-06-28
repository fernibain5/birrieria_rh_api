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
import { CreateMinutaDto } from './dto/create-minuta.dto';
import { MinutasService } from './minutas.service';

@Controller('minutas')
export class MinutasController {
  constructor(private readonly minutasService: MinutasService) {}

  @Get()
  findAll(@Query('role') role?: string, @Query('branch') branch?: string) {
    return this.minutasService.findAll(role, branch);
  }

  @Post()
  create(@Body() dto: CreateMinutaDto) {
    return this.minutasService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/areas/:index/complete')
  completeArea(
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number,
    @Request() req: any,
  ) {
    return this.minutasService.completeArea(id, index, req.user);
  }
}
