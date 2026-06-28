import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { EmployeesModule } from './employees/employees.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { EventsModule } from './events/events.module';
import { MinutasModule } from './minutas/minutas.module';
import { ResourcesModule } from './resources/resources.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RestaurantsModule,
    EmployeesModule,
    AttendanceModule,
    AuthModule,
    UsersModule,
    RolesModule,
    EventsModule,
    MinutasModule,
    ResourcesModule,
  ],
})
export class AppModule {}
