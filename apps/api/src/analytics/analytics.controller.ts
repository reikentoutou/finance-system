import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../common/decorators/roles.decorator';
import type { Period } from './period-range';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  @Roles(Role.ADMIN)
  summary(
    @Query('period') period: Period,
    @Query('anchorDate') anchorDate: string,
  ) {
    return this.analytics.summary(period, anchorDate);
  }
}
