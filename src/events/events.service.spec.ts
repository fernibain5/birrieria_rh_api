import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RequestUser } from '../auth/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from './events.service';

const admin: RequestUser = { id: 'u-admin', email: 'a@x.com', role: 'admin', restaurantId: null };
const gerente: RequestUser = { id: 'u-ger', email: 'g@x.com', role: 'gerente', restaurantId: 1 };
const subgerente: RequestUser = { id: 'u-sub', email: 's@x.com', role: 'subgerente', restaurantId: 1 };

describe('EventsService', () => {
  let service: EventsService;
  let prisma: {
    restaurant: { findFirst: jest.Mock };
    event: { create: jest.Mock; update: jest.Mock; delete: jest.Mock; findUnique: jest.Mock };
  };

  const dto = { title: 'Junta', date: '2026-10-10', targetBranch: 'Otra' };

  beforeEach(async () => {
    prisma = {
      restaurant: { findFirst: jest.fn().mockResolvedValue({ id: 2 }) },
      event: {
        create: jest.fn().mockResolvedValue({ id: 'e1' }),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [EventsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(EventsService);
  });

  describe('create', () => {
    it('lets admin target any branch', async () => {
      await service.create(dto, admin);
      expect(prisma.event.create.mock.calls[0][0].data.targetRestaurantId).toBe(2);
    });

    it('forces non-admins to their own branch and records them as creator', async () => {
      await service.create({ ...dto, createdBy: 'someone-else' }, subgerente);
      const data = prisma.event.create.mock.calls[0][0].data;
      expect(data.targetRestaurantId).toBe(1);
      expect(data.createdById).toBe('u-sub');
      expect(prisma.restaurant.findFirst).not.toHaveBeenCalled();
    });

    it('rejects non-admins without a branch', async () => {
      await expect(service.create(dto, { ...gerente, restaurantId: null })).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.event.create).not.toHaveBeenCalled();
    });
  });

  describe('update / remove', () => {
    it('lets admin modify any event without a lookup', async () => {
      await service.update('e1', { title: 'x' }, admin);
      await service.remove('e1', admin);
      expect(prisma.event.findUnique).not.toHaveBeenCalled();
      expect(prisma.event.update).toHaveBeenCalled();
      expect(prisma.event.delete).toHaveBeenCalled();
    });

    it('lets gerente modify events of their own branch', async () => {
      prisma.event.findUnique.mockResolvedValue({ id: 'e1', targetRestaurantId: 1 });
      await service.update('e1', { title: 'x' }, gerente);
      await service.remove('e1', gerente);
      expect(prisma.event.update).toHaveBeenCalled();
      expect(prisma.event.delete).toHaveBeenCalled();
    });

    it.each([
      ['another branch', 2],
      ['global', null],
    ])('forbids gerente from modifying %s events', async (_label, targetRestaurantId) => {
      prisma.event.findUnique.mockResolvedValue({ id: 'e1', targetRestaurantId });
      await expect(service.update('e1', { title: 'x' }, gerente)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove('e1', gerente)).rejects.toThrow(ForbiddenException);
      expect(prisma.event.update).not.toHaveBeenCalled();
      expect(prisma.event.delete).not.toHaveBeenCalled();
    });

    it('returns 404 for missing events', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(service.remove('nope', gerente)).rejects.toThrow(NotFoundException);
    });
  });
});
