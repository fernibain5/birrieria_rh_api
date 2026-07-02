import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from './attendance.service';

/**
 * Scheduled attendance sync. Pulls events from every active restaurant's
 * Hikvision device (reached via its Tailscale tunnel) so nobody has to press
 * "Sincronizar". Enabled only when SYNC_CRON_ENABLED=true so local dev
 * doesn't try to reach the devices.
 */
@Injectable()
export class AttendanceCronService {
  private readonly logger = new Logger(AttendanceCronService.name);
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleAutoSync(): Promise<void> {
    if (this.config.get<string>('SYNC_CRON_ENABLED') !== 'true') return;
    if (this.running) {
      this.logger.warn('Previous auto-sync still in progress — skipping tick');
      return;
    }
    this.running = true;
    try {
      const restaurants = await this.prisma.restaurant.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      for (const restaurant of restaurants) {
        // sync() already handles device/network failures internally (error
        // SyncLog row); this catch keeps one restaurant from blocking the rest.
        try {
          const result = await this.attendanceService.sync(restaurant.id);
          this.logger.log(
            `Auto-sync "${restaurant.name}" (#${restaurant.id}): ${result.status}, ${result.recordsSynced} records`,
          );
        } catch (err) {
          this.logger.error(
            `Auto-sync "${restaurant.name}" (#${restaurant.id}) failed: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }
}
