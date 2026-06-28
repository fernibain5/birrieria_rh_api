import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMinutaDto } from './dto/create-minuta.dto';

@Injectable()
export class MinutasService {
  constructor(private readonly prisma: PrismaService) {}

  private async branchToId(branch?: string): Promise<number | null> {
    if (!branch) return null;
    const r = await this.prisma.restaurant.findFirst({ where: { name: branch } });
    return r?.id ?? null;
  }

  private toMinuta(m: any) {
    const areas = (m.areas ?? [])
      .sort((a: any, b: any) => a.index - b.index)
      .map((a: any) => ({
        area: a.area,
        planteamiento: a.planteamiento,
        seguimiento: a.seguimiento,
        fechaCompromiso: a.fechaCompromiso,
        status: a.status,
        encargadoName: a.encargadoName ?? undefined,
        encargadoUids: a.encargadoUids ?? [],
      }));

    const areaEventIds = (m.areas ?? [])
      .sort((a: any, b: any) => a.index - b.index)
      .map((a: any) => a.calendarEventId)
      .filter(Boolean);

    const attendees = (m.attendees ?? []).map((att: any) => ({
      uid: att.userId ?? '',
      displayName: att.displayName ?? undefined,
      email: att.email ?? undefined,
      area: att.area ?? undefined,
    }));

    return {
      id: m.id,
      supervisor: m.supervisor ?? undefined,
      branch: m.restaurant?.name ?? undefined,
      role: m.role ?? undefined,
      whatHappened: m.whatHappened ?? undefined,
      expectations: m.expectations ?? undefined,
      nextMeetingDate: m.nextMeetingDate ?? undefined,
      createdAt: m.createdAt,
      createdBy: m.createdById,
      eventId: m.legacyEventId ?? undefined,
      areaEventIds,
      status: m.status,
      responsibleUids: m.responsibleUids ?? [],
      generalInfo: m.generalInfo ?? undefined,
      areas,
      attendees,
    };
  }

  private getResponsibleUids(areas: Record<string, unknown>[]): string[] {
    const uids = new Set<string>();
    for (const area of areas) {
      const encUids = (area.encargadoUids as string[]) ?? [];
      const encUid = area.encargadoUid as string | undefined;
      const list = encUids.length > 0 ? encUids : encUid ? [encUid] : [];
      list.filter(Boolean).forEach((u) => uids.add(u));
    }
    return Array.from(uids);
  }

  async findAll(role?: string, branch?: string) {
    const where: any = {};
    if (role) where.role = role;
    if (branch) where.restaurantId = await this.branchToId(branch);

    const minutas = await this.prisma.minuta.findMany({
      where,
      include: {
        restaurant: true,
        areas: { orderBy: { index: 'asc' } },
        attendees: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return minutas.map((m) => this.toMinuta(m));
  }

  async create(dto: CreateMinutaDto): Promise<{ id: string }> {
    const restaurantId = await this.branchToId(dto.branch);
    const areas = (dto.areas ?? []) as Record<string, unknown>[];
    const attendees = (dto.attendees ?? []) as Record<string, unknown>[];
    const responsibleUids = dto.responsibleUids?.length
      ? dto.responsibleUids
      : this.getResponsibleUids(areas);

    const minuta = await this.prisma.minuta.create({
      data: {
        supervisor: dto.supervisor ?? null,
        restaurantId,
        role: dto.role ?? null,
        whatHappened: dto.whatHappened ?? null,
        expectations: dto.expectations ?? null,
        nextMeetingDate: dto.nextMeetingDate ? new Date(dto.nextMeetingDate) : null,
        createdById: dto.createdBy,
        status: 'pending',
        responsibleUids,
        generalInfo: (dto.generalInfo as any) ?? null,
      },
    });

    // Create one calendar Event per area and one MinutaArea row each
    const areaEventIds: string[] = [];
    for (let i = 0; i < areas.length; i++) {
      const area = areas[i];
      const eventDate = area.fechaCompromiso
        ? new Date(area.fechaCompromiso as string)
        : dto.nextMeetingDate
          ? new Date(dto.nextMeetingDate)
          : new Date();

      const event = await this.prisma.event.create({
        data: {
          title: (area.area as string) ?? '',
          description: `Seguimiento del problema\nResponsable: ${(area.encargadoName as string) ?? 'Sin responsable'}`,
          date: eventDate,
          year: eventDate.getFullYear(),
          color: 'bg-purple-100 text-purple-800',
          type: 'minuta',
          createdById: dto.createdBy,
          targetRole: dto.role ?? null,
          targetRestaurantId: restaurantId,
          minutaId: minuta.id,
        },
      });
      areaEventIds.push(event.id);

      const encargadoUids =
        (area.encargadoUids as string[]) ??
        (area.encargadoUid ? [area.encargadoUid as string] : []);

      await this.prisma.minutaArea.create({
        data: {
          minutaId: minuta.id,
          index: i,
          area: (area.area as string) ?? '',
          planteamiento: (area.planteamiento as string) ?? '',
          seguimiento: (area.seguimiento as string) ?? '',
          fechaCompromiso: (area.fechaCompromiso as string) ?? '',
          status: (area.status as string) ?? 'pending',
          encargadoName: (area.encargadoName as string) ?? null,
          encargadoUids,
          calendarEventId: event.id,
        },
      });
    }

    // Create attendee rows
    for (const att of attendees) {
      await this.prisma.minutaAttendee.create({
        data: {
          minutaId: minuta.id,
          userId: (att.uid as string) ?? null,
          displayName: (att.displayName as string) ?? null,
          email: (att.email as string) ?? null,
          area: (att.area as string) ?? null,
        },
      });
    }

    // Store areaEventIds (already on each MinutaArea, but update responsibleUids too)
    await this.prisma.minuta.update({
      where: { id: minuta.id },
      data: { responsibleUids },
    });

    return { id: minuta.id };
  }

  async completeArea(minutaId: string, areaIndex: number, jwtUser: { id: string; role: string }) {
    const minuta = await this.prisma.minuta.findUnique({
      where: { id: minutaId },
      include: { areas: { orderBy: { index: 'asc' } }, restaurant: true, attendees: true },
    });

    if (!minuta) throw new NotFoundException('Minuta not found');

    const area = minuta.areas.find((a) => a.index === areaIndex);
    if (!area) throw new NotFoundException('Area not found');

    const canComplete =
      jwtUser.role === 'admin' || area.encargadoUids.includes(jwtUser.id);
    if (!canComplete) throw new ForbiddenException('Not authorized to complete this area');
    if (area.status === 'completed') return this.toMinuta(minuta);

    await this.prisma.minutaArea.update({
      where: { id: area.id },
      data: { status: 'completed' },
    });

    // Re-fetch to check overall minuta status
    const updatedAreas = await this.prisma.minutaArea.findMany({
      where: { minutaId },
      orderBy: { index: 'asc' },
    });
    const allDone = updatedAreas.every((a) => a.status === 'completed');
    const newStatus = allDone ? 'completed' : 'pending';

    await this.prisma.minuta.update({ where: { id: minutaId }, data: { status: newStatus } });

    // When fully completed, delete all area calendar events
    if (allDone) {
      const eventIds = updatedAreas.map((a) => a.calendarEventId).filter(Boolean) as string[];
      await this.prisma.event.deleteMany({ where: { id: { in: eventIds } } });
    }

    const fresh = await this.prisma.minuta.findUnique({
      where: { id: minutaId },
      include: { areas: { orderBy: { index: 'asc' } }, restaurant: true, attendees: true },
    });
    return this.toMinuta(fresh);
  }
}
