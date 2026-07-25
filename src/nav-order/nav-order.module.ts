import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NavOrderController } from './nav-order.controller';
import { NavOrderService } from './nav-order.service';

@Module({
  imports: [PrismaModule],
  controllers: [NavOrderController],
  providers: [NavOrderService],
})
export class NavOrderModule {}
