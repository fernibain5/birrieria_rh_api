import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { ReorderResourcesDto } from './dto/reorder-resources.dto';
import { ResourcesService } from './resources.service';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  findAll() {
    return this.resourcesService.findAll();
  }

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

  @Patch('reorder')
  reorder(@Body() dto: ReorderResourcesDto) {
    return this.resourcesService.reorder(dto.ids);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resourcesService.remove(id);
  }
}
