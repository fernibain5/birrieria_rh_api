import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserDocumentsController } from './user-documents.controller';
import { UserDocumentsService } from './user-documents.service';

@Module({
  imports: [PrismaModule],
  controllers: [UserDocumentsController],
  providers: [UserDocumentsService],
})
export class UserDocumentsModule {}
