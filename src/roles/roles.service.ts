import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({ orderBy: { label: 'asc' } });
  }

  async create(dto: CreateRoleDto) {
    await this.prisma.role.upsert({
      where: { value: dto.value },
      update: { label: dto.label, color: dto.color },
      create: { value: dto.value, label: dto.label, color: dto.color, isSystem: false },
    });
  }

  async remove(value: string) {
    await this.prisma.role.delete({ where: { value } });
  }
}
