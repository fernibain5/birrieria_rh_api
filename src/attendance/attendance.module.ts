import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceCronService } from './attendance-cron.service';
import { AttendanceController } from './attendance.controller';
import { HikvisionModule } from '../hikvision/hikvision.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';

@Module({
  imports: [HikvisionModule, RestaurantsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceCronService],
})
export class AttendanceModule {}
