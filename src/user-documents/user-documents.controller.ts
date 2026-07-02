import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UserDocumentsService } from './user-documents.service';

@Controller('users/:userId/documents')
export class UserDocumentsController {
  constructor(private readonly userDocumentsService: UserDocumentsService) {}

  @Get()
  findAll(@Param('userId') userId: string) {
    return this.userDocumentsService.findAllForUser(userId);
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
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('fileName') fileName: string,
    @Body('uploadedBy') uploadedBy: string,
  ) {
    return this.userDocumentsService.create(file, userId, fileName, uploadedBy || '');
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userDocumentsService.remove(id);
  }
}
