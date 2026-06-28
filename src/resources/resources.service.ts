import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private toResource(r: any) {
    return {
      id: r.id,
      fileName: r.fileName,
      originalName: r.originalName,
      fileUrl: r.fileUrl,
      storagePath: r.storagePath,
      contentType: r.contentType,
      size: r.size,
      order: r.order,
      adminOnly: r.adminOnly,
      createdAt: r.createdAt,
      createdBy: r.createdById ?? '',
    };
  }

  async findAll() {
    const resources = await this.prisma.resource.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    return resources.map((r) => this.toResource(r));
  }

  async create(
    file: Express.Multer.File,
    fileName: string,
    adminOnly: boolean,
    createdById: string,
  ) {
    const apiUrl = this.config.get<string>('API_URL') ?? 'http://localhost:3001';
    const fileUrl = `${apiUrl}/uploads/${file.filename}`;

    // Next order number within the same adminOnly group
    const maxOrder = await this.prisma.resource.aggregate({
      where: { adminOnly },
      _max: { order: true },
    });
    const order = (maxOrder._max.order ?? 0) + 1;

    const resource = await this.prisma.resource.create({
      data: {
        fileName: fileName.trim(),
        originalName: file.originalname,
        fileUrl,
        storagePath: file.path,
        contentType: file.mimetype || 'application/octet-stream',
        size: file.size,
        order,
        adminOnly,
        createdById: createdById || null,
      },
    });
    return this.toResource(resource);
  }

  async remove(id: string) {
    const resource = await this.prisma.resource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException('Resource not found');

    // Delete local file if it exists (uploads dir)
    if (resource.storagePath && fs.existsSync(resource.storagePath)) {
      fs.unlinkSync(resource.storagePath);
    }

    await this.prisma.resource.delete({ where: { id } });
  }

  async reorder(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.resource.update({ where: { id }, data: { order: index + 1 } }),
      ),
    );
  }
}
