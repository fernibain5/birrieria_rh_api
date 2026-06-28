import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private async branchToId(branch?: string): Promise<number | null> {
    if (!branch) return null;
    const r = await this.prisma.restaurant.findFirst({ where: { name: branch } });
    return r?.id ?? null;
  }

  private toEvent(e: any) {
    return {
      id: e.id,
      title: e.title,
      description: e.description ?? undefined,
      date: e.date,
      color: e.color ?? undefined,
      type: e.type,
      year: e.year ?? undefined,
      createdAt: e.createdAt,
      createdBy: e.createdById ?? undefined,
      targetRole: e.targetRole ?? undefined,
      targetBranch: e.targetRestaurant?.name ?? undefined,
      minutaId: e.minutaId ?? undefined,
    };
  }

  async findAll(year?: number) {
    const where = year ? { year } : {};
    const events = await this.prisma.event.findMany({
      where,
      include: { targetRestaurant: true },
      orderBy: { date: 'asc' },
    });
    return events.map((e) => this.toEvent(e));
  }

  async checkHolidaysExist(year: number, branch: string): Promise<{ exists: boolean }> {
    const restaurantId = await this.branchToId(branch);
    const count = await this.prisma.event.count({
      where: { type: 'holiday', year, targetRestaurantId: restaurantId },
    });
    return { exists: count > 0 };
  }

  async create(dto: CreateEventDto): Promise<{ id: string }> {
    const targetRestaurantId = await this.branchToId(dto.targetBranch);
    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        date: new Date(dto.date),
        color: dto.color ?? null,
        type: dto.type ?? 'custom',
        year: dto.year ?? new Date(dto.date).getFullYear(),
        createdById: dto.createdBy ?? null,
        targetRole: dto.targetRole ?? null,
        targetRestaurantId,
        minutaId: dto.minutaId ?? null,
      },
    });
    return { id: event.id };
  }

  async update(id: string, dto: UpdateEventDto): Promise<void> {
    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.date !== undefined) {
      data.date = new Date(dto.date);
      data.year = new Date(dto.date).getFullYear();
    }
    await this.prisma.event.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.event.delete({ where: { id } });
  }
}
