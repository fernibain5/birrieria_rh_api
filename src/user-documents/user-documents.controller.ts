import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { UserDocumentsService } from './user-documents.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'gerente')
@Controller('users/:userId/documents')
export class UserDocumentsController {
  constructor(private readonly userDocumentsService: UserDocumentsService) {}

  @Get()
  findAll(@Param('userId') userId: string, @Request() req: { user: RequestUser }) {
    return this.userDocumentsService.findAllForUser(userId, req.user);
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
    @Request() req: { user: RequestUser },
  ) {
    return this.userDocumentsService.create(file, userId, fileName, uploadedBy || '', req.user);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: { user: RequestUser },
  ) {
    return this.userDocumentsService.remove(id, userId, req.user);
  }
}
