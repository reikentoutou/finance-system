import {
  BadRequestException,
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
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { diskStorage } from 'multer';
import { join } from 'path';
import { randomUUID } from 'crypto';

function pickUploadExtension(file: Express.Multer.File): string {
  const name = file.originalname || '';
  if (name.includes('.')) {
    return name.slice(name.lastIndexOf('.')).toLowerCase();
  }
  const mt = (file.mimetype || '').toLowerCase();
  if (mt === 'application/pdf') return '.pdf';
  if (mt === 'text/plain') return '.txt';
  if (
    mt === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return '.xlsx';
  }
  if (mt === 'application/vnd.ms-excel') return '.xls';
  if (mt === 'image/jpeg' || mt === 'image/jpg') return '.jpg';
  if (mt === 'image/png') return '.png';
  if (mt === 'image/webp') return '.webp';
  if (mt === 'image/gif') return '.gif';
  if (mt.startsWith('image/')) {
    const sub = mt.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    return `.${sub}`;
  }
  return '.bin';
}
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

  /** 税抜円（サーバーで×1.1 し税込で保存） */
  @IsInt()
  @Min(0)
  chargeNightPackYen!: number;

  @IsInt()
  @Min(0)
  productSalesYen!: number;

  /** 券种 id → 枚数（仅允许有效券种 id） */
  @IsObject()
  taxFreeCouponCounts!: Record<string, unknown>;

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

  /** 管理员 POST 补录时必填：归属网管的用户 id */
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

  /** 税抜円（サーバーで×1.1 し税込で保存） */
  @IsOptional()
  @IsInt()
  @Min(0)
  chargeNightPackYen?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  productSalesYen?: number;

  @IsOptional()
  @IsObject()
  taxFreeCouponCounts?: Record<string, unknown>;

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
    @Query('limit') limitRaw?: string,
  ) {
    let limit: number | undefined;
    if (limitRaw !== undefined && limitRaw !== '') {
      const n = parseInt(limitRaw, 10);
      if (!Number.isFinite(n) || n < 1) {
        throw new BadRequestException('limit must be a positive integer');
      }
      limit = Math.min(n, 5000);
    }
    return this.svc.list(this.auth(req), { from, to, reportDate, limit });
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
            cb(null, `${randomUUID()}${pickUploadExtension(file)}`);
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
    return this.svc.applyUploadedPhotos(id, this.auth(req), files);
  }
}
