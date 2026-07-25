import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestUser } from '../auth/request-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpdateNavOrderDto } from './dto/update-nav-order.dto';
import { NavOrderService } from './nav-order.service';

@UseGuards(JwtAuthGuard)
@Controller('nav-order')
export class NavOrderController {
  constructor(private readonly navOrderService: NavOrderService) {}

  @Get()
  async findOne() {
    return { order: await this.navOrderService.findOrder() };
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch()
  async update(@Body() dto: UpdateNavOrderDto, @Request() req: { user: RequestUser }) {
    return { order: await this.navOrderService.updateOrder(dto.order, req.user.id) };
  }
}
