import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private toProfile(user: any) {
    return {
      uid: user.id,
      email: user.email,
      role: user.roleValue,
      branch: user.restaurant?.name ?? undefined,
      displayName: user.displayName ?? undefined,
      phoneNumber: user.phoneNumber ?? undefined,
      allFiles: user.allFiles ?? [],
    };
  }

  private async branchToId(branch?: string): Promise<number | null> {
    if (!branch) return null;
    const r = await this.prisma.restaurant.findFirst({ where: { name: branch } });
    return r?.id ?? null;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { restaurant: true },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.toProfile(u));
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { restaurant: true },
    });
    return user ? this.toProfile(user) : null;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const [restaurantId, hash] = await Promise.all([
      this.branchToId(dto.branch),
      bcrypt.hash(dto.password, 10),
    ]);

    const user = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        email: dto.email,
        password: hash,
        displayName: dto.displayName,
        roleValue: dto.role,
        restaurantId,
        phoneNumber: dto.phoneNumber ?? null,
        allFiles: [],
      },
      include: { restaurant: true },
    });

    return this.toProfile(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const data: any = {};
    if (dto.role !== undefined) data.roleValue = dto.role;
    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;
    if (dto.branch !== undefined) data.restaurantId = await this.branchToId(dto.branch);

    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: { restaurant: true },
    });
    return this.toProfile(user);
  }
}
