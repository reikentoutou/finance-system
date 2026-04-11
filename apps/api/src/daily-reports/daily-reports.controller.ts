import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { diskStorage } from 'multer';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { DailyReportsService } from './daily-reports.service';
import { Roles } from '../common/decorators/roles.decorator';

class CreateDailyReportDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  reportDate!: string;

  @IsString()
  shiftId!: string;

  @IsString()
  responsiblePersonId!: string;

  @IsInt()
  @Min(0)
  @Max(1439)
  startMinuteOfDay!: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  endMinuteOfDay!: number;

  @IsInt()
  @Min(0)
  chargeNightPackYen!: number;

  @IsInt()
  @Min(0)
  productSalesYen!: number;

  @IsInt()
  @Min(0)
  taxFreeTier1Count!: number;

  @IsInt()
  @Min(0)
  taxFreeTier2Count!: number;

  @IsInt()
  @Min(0)
  taxFreeTier3Count!: number;

  @IsInt()
  @Min(0)
  newageYen!: number;

  @IsInt()
  @Min(0)
  airpayQrYen!: number;

  @IsInt()
  @Min(0)
  cashTotalYen!: number;

  @IsOptional()
  @IsString()
  deviationReason?: string;

  /** Admin POST 补录时必填：归属网管 user id */
  @IsOptional()
  @IsString()
  createdByUserId?: string;
}

class UpdateDailyReportDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  reportDate?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsOptional()
  @IsString()
  responsiblePersonId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinuteOfDay?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  endMinuteOfDay?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  chargeNightPackYen?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  productSalesYen?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  taxFreeTier1Count?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  taxFreeTier2Count?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  taxFreeTier3Count?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  newageYen?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  airpayQrYen?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cashTotalYen?: number;

  @IsOptional()
  @IsString()
  deviationReason?: string;
}

@Controller('daily-reports')
export class DailyReportsController {
  constructor(private readonly svc: DailyReportsService) {}

  private auth(req: Request) {
    const u = req.user as { userId: string; role: Role };
    return { userId: u.userId, role: u.role };
  }

  @Get()
  list(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('reportDate') reportDate?: string,
  ) {
    return this.svc.list(this.auth(req), { from, to, reportDate });
  }

  /** 使用两段路径，避免被 @Get(':id') 当成 id=business-day-hint → 404 */
  @Get('hint/business-day')
  businessDayHint(
    @Query('reportDate') reportDate: string,
    @Query('shiftId') shiftId: string,
  ) {
    return this.svc.businessDayHint(reportDate, shiftId);
  }

  @Get(':id')
  one(@Req() req: Request, @Param('id') id: string) {
    return this.svc.findOne(this.auth(req), id);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateDailyReportDto) {
    return this.svc.create(this.auth(req), dto);
  }

  @Put(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateDailyReportDto,
  ) {
    return this.svc.update(this.auth(req), id, dto);
  }

  @Post(':id/photos')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'ddn', maxCount: 1 },
        { name: 'taxFree', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: (_r, _f, cb) => {
            const dir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
            cb(null, dir);
          },
          filename: (_req, file, cb) => {
            const ext = file.originalname.includes('.')
              ? file.originalname.slice(file.originalname.lastIndexOf('.'))
              : '.jpg';
            cb(null, `${randomUUID()}${ext}`);
          },
        }),
        limits: { fileSize: 8 * 1024 * 1024 },
      },
    ),
  )
  async uploadPhotos(
    @Req() req: Request,
    @Param('id') id: string,
    @UploadedFiles()
    files: { ddn?: Express.Multer.File[]; taxFree?: Express.Multer.File[] },
  ) {
    const base = '/uploads/';
    if (files.ddn?.[0]) {
      await this.svc.setPhotoKey(id, this.auth(req), 'ddn', base + files.ddn[0].filename);
    }
    if (files.taxFree?.[0]) {
      await this.svc.setPhotoKey(
        id,
        this.auth(req),
        'taxFree',
        base + files.taxFree[0].filename,
      );
    }
    return this.svc.findOne(this.auth(req), id);
  }
}
