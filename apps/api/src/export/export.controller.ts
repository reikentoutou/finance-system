import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { ExportService } from './export.service';
import { Roles } from '../common/decorators/roles.decorator';
import type { Period } from '../analytics/period-range';

@Controller('export')
@Roles(Role.ADMIN)
export class ExportController {
  constructor(private readonly exportSvc: ExportService) {}

  @Get('daily/:id')
  async exportDaily(
    @Param('id') id: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    if (format === 'xlsx') return this.exportSvc.exportDailyXlsx(id, res);
    if (format === 'pdf') return this.exportSvc.exportDailyPdf(id, res);
    throw new BadRequestException('format must be xlsx or pdf');
  }

  @Get('aggregate')
  async exportAggregate(
    @Query('period') period: string,
    @Query('anchorDate') anchorDate: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    if (!anchorDate) throw new BadRequestException('anchorDate required');
    const valid: Period[] = ['day', 'week', 'month', 'quarter', 'year'];
    const p = (period || '').trim() as Period;
    if (!valid.includes(p)) {
      throw new BadRequestException(
        `Invalid period "${period}", expected one of: ${valid.join(', ')}`,
      );
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    if (format === 'xlsx')
      return this.exportSvc.exportAggregateXlsx(p, anchorDate, res);
    if (format === 'pdf')
      return this.exportSvc.exportAggregatePdf(p, anchorDate, res);
    throw new BadRequestException('format must be xlsx or pdf');
  }
}
