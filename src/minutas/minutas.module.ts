import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MinutasController } from './minutas.controller';
import { MinutasService } from './minutas.service';

@Module({
  imports: [PrismaModule],
  controllers: [MinutasController],
  providers: [MinutasService],
})
export class MinutasModule {}
