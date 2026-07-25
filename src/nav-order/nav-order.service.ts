import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NavOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrder(): Promise<string[]> {
    const row = await this.prisma.navOrder.findUnique({ where: { id: 1 } });
    return row?.order ?? [];
  }

  async updateOrder(order: string[], updatedById: string): Promise<string[]> {
    const row = await this.prisma.navOrder.upsert({
      where: { id: 1 },
      create: { id: 1, order, updatedById },
      update: { order, updatedById },
    });
    return row.order;
  }
}
