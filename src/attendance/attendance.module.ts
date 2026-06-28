import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { HikvisionModule } from '../hikvision/hikvision.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';

@Module({
  imports: [HikvisionModule, RestaurantsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
