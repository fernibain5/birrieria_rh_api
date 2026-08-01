import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestUser } from '../auth/request-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ReorderResourcesDto } from './dto/reorder-resources.dto';
import { ResourcesService } from './resources.service';

@UseGuards(JwtAuthGuard)
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  findAll(@Request() req: { user: RequestUser }) {
    return this.resourcesService.findAll(req.user);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'gerente')
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
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('fileName') fileName: string,
    @Body('adminOnly') adminOnly: string,
    @Body('createdBy') createdBy: string,
  ) {
    return this.resourcesService.create(file, fileName, adminOnly === 'true', createdBy ?? '');
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'gerente')
  @Patch('reorder')
  reorder(@Body() dto: ReorderResourcesDto) {
    return this.resourcesService.reorder(dto.ids);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'gerente')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resourcesService.remove(id);
  }
}
