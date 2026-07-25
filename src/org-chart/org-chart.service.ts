import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrgChartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private toOrgChart(o: any) {
    return {
      id: o.id,
      fileName: o.fileName,
      originalName: o.originalName,
      fileUrl: o.fileUrl,
      storagePath: o.storagePath,
      contentType: o.contentType,
      size: o.size,
      createdAt: o.createdAt,
      createdBy: o.createdById ?? '',
    };
  }

  async findOne() {
    const orgChart = await this.prisma.orgChart.findFirst();
    return orgChart ? this.toOrgChart(orgChart) : null;
  }

  async replace(file: Express.Multer.File, createdById: string) {
    const existing = await this.prisma.orgChart.findFirst();
    if (existing) {
      if (existing.storagePath && fs.existsSync(existing.storagePath)) {
        fs.unlinkSync(existing.storagePath);
      }
      await this.prisma.orgChart.delete({ where: { id: existing.id } });
    }

    const apiUrl = this.config.get<string>('API_URL') ?? 'http://localhost:3001';
    const fileUrl = `${apiUrl}/uploads/${file.filename}`;

    const orgChart = await this.prisma.orgChart.create({
      data: {
        fileName: file.originalname,
        originalName: file.originalname,
        fileUrl,
        storagePath: file.path,
        contentType: file.mimetype || 'application/octet-stream',
        size: file.size,
        createdById: createdById || null,
      },
    });
    return this.toOrgChart(orgChart);
  }

  async remove() {
    const existing = await this.prisma.orgChart.findFirst();
    if (!existing) throw new NotFoundException('No hay organigrama para eliminar');

    if (existing.storagePath && fs.existsSync(existing.storagePath)) {
      fs.unlinkSync(existing.storagePath);
    }
    await this.prisma.orgChart.delete({ where: { id: existing.id } });
  }
}
