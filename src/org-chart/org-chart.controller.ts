import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestUser } from '../auth/request-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrgChartService } from './org-chart.service';

@UseGuards(JwtAuthGuard)
@Controller('org-chart')
export class OrgChartController {
  constructor(private readonly orgChartService: OrgChartService) {}

  @Get()
  findOne() {
    return this.orgChartService.findOne();
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const ts = Date.now();
          const safe = file.originalname.replace(/[^\w.\-() ]+/g, '_').replace(/\s+/g, '_');
          cb(null, `${ts}-${safe}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('El archivo debe ser una imagen'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @Request() req: { user: RequestUser }) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return this.orgChartService.replace(file, req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete()
  remove() {
    return this.orgChartService.remove();
  }
}
