import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private toDocument(d: any) {
    return {
      id: d.id,
      userId: d.userId,
      fileName: d.fileName,
      originalName: d.originalName,
      fileUrl: d.fileUrl,
      storagePath: d.storagePath,
      contentType: d.contentType,
      size: d.size,
      createdAt: d.createdAt,
      uploadedBy: d.uploadedById ?? '',
    };
  }

  async findAllForUser(userId: string) {
    const documents = await this.prisma.userDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return documents.map((d) => this.toDocument(d));
  }

  async create(
    file: Express.Multer.File,
    userId: string,
    fileName: string,
    uploadedById: string,
  ) {
    const apiUrl = this.config.get<string>('API_URL') ?? 'http://localhost:3001';
    const fileUrl = `${apiUrl}/uploads/${file.filename}`;

    const document = await this.prisma.userDocument.create({
      data: {
        userId,
        fileName: (fileName || file.originalname).trim(),
        originalName: file.originalname,
        fileUrl,
        storagePath: file.path,
        contentType: file.mimetype || 'application/octet-stream',
        size: file.size,
        uploadedById: uploadedById || null,
      },
    });
    return this.toDocument(document);
  }

  async remove(id: string) {
    const document = await this.prisma.userDocument.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Document not found');

    if (document.storagePath && fs.existsSync(document.storagePath)) {
      fs.unlinkSync(document.storagePath);
    }

    await this.prisma.userDocument.delete({ where: { id } });
  }
}
