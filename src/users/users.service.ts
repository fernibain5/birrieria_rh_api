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
      hireDate: user.hireDate ? user.hireDate.toISOString().slice(0, 10) : undefined,
      birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : undefined,
      allFiles: user.allFiles ?? [],
      employeeId: user.employeeId ?? undefined,
      employee: user.employee
        ? {
            id: user.employee.id,
            name: user.employee.name,
            hikvisionId: user.employee.hikvisionId,
          }
        : undefined,
    };
  }

  private async branchToId(branch?: string): Promise<number | null> {
    if (!branch) return null;
    const r = await this.prisma.restaurant.findFirst({ where: { name: branch } });
    return r?.id ?? null;
  }

  private toDateOnly(value?: string): Date | null {
    if (!value) return null;
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { restaurant: true, employee: true },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.toProfile(u));
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { restaurant: true, employee: true },
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
        hireDate: this.toDateOnly(dto.hireDate),
        birthDate: this.toDateOnly(dto.birthDate),
        allFiles: [],
      },
      include: { restaurant: true, employee: true },
    });

    return this.toProfile(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const data: any = {};
    if (dto.role !== undefined) data.roleValue = dto.role;
    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;
    if (dto.hireDate !== undefined) data.hireDate = this.toDateOnly(dto.hireDate);
    if (dto.birthDate !== undefined) data.birthDate = this.toDateOnly(dto.birthDate);
    if (dto.branch !== undefined) data.restaurantId = await this.branchToId(dto.branch);
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    if (dto.employeeId !== undefined) data.employeeId = dto.employeeId;

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data,
        include: { restaurant: true, employee: true },
      });
      return this.toProfile(user);
    } catch (error) {
      if (error.code === 'P2002' && dto.employeeId !== undefined) {
        throw new ConflictException(
          'Este empleado ya está vinculado a otro usuario',
        );
      }
      throw error;
    }
  }
}
