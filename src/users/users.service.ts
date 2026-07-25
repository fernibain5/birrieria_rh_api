import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { RequestUser } from '../auth/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const ELEVATED_ROLES = ['admin', 'gerente'];

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
      lastName: user.lastName ?? undefined,
      phoneNumber: user.phoneNumber ?? undefined,
      hireDate: user.hireDate ? user.hireDate.toISOString().slice(0, 10) : undefined,
      birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : undefined,
      restDays: user.restDays,
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

  async findAll(requestUser?: RequestUser) {
    const where =
      requestUser && requestUser.role !== 'admin'
        ? { restaurantId: requestUser.restaurantId }
        : {};
    const users = await this.prisma.user.findMany({
      where,
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

  // Like findById, but returns null (→ 404 at the controller) if a non-admin
  // caller is looking up a user outside their own branch.
  async findByIdScoped(id: string, requestUser: RequestUser) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { restaurant: true, employee: true },
    });
    if (!user) return null;
    if (requestUser.role !== 'admin' && user.restaurantId !== requestUser.restaurantId) {
      return null;
    }
    return this.toProfile(user);
  }

  async create(dto: CreateUserDto, requestUser: RequestUser) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    let restaurantId: number | null;
    if (requestUser.role !== 'admin') {
      if (ELEVATED_ROLES.includes(dto.role)) {
        throw new ForbiddenException('No puedes asignar este rol');
      }
      restaurantId = requestUser.restaurantId;
    } else {
      restaurantId = await this.branchToId(dto.branch);
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        email: dto.email,
        password: hash,
        displayName: dto.displayName,
        lastName: dto.lastName,
        roleValue: dto.role,
        restaurantId,
        phoneNumber: dto.phoneNumber ?? null,
        hireDate: this.toDateOnly(dto.hireDate),
        birthDate: this.toDateOnly(dto.birthDate),
        restDays: dto.restDays,
        allFiles: [],
      },
      include: { restaurant: true, employee: true },
    });

    return this.toProfile(user);
  }

  async update(id: string, dto: UpdateUserDto, requestUser: RequestUser) {
    if (requestUser.role !== 'admin') {
      const existing = await this.prisma.user.findUnique({
        where: { id },
        select: { restaurantId: true },
      });
      if (!existing || existing.restaurantId !== requestUser.restaurantId) {
        throw new ForbiddenException('No puedes editar usuarios de otra sucursal');
      }
      if (dto.role !== undefined && ELEVATED_ROLES.includes(dto.role)) {
        throw new ForbiddenException('No puedes asignar este rol');
      }
    }

    const data: any = {};
    if (dto.role !== undefined) data.roleValue = dto.role;
    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;
    if (dto.hireDate !== undefined) data.hireDate = this.toDateOnly(dto.hireDate);
    if (dto.birthDate !== undefined) data.birthDate = this.toDateOnly(dto.birthDate);
    if (dto.restDays !== undefined) data.restDays = dto.restDays;
    if (dto.branch !== undefined) {
      data.restaurantId =
        requestUser.role === 'admin'
          ? await this.branchToId(dto.branch)
          : requestUser.restaurantId;
    }
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
