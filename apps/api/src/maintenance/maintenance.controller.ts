import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { MaintenanceService } from './maintenance.service';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get('backup/export')
  @Roles(Role.ADMIN)
  async exportBackup(@Res({ passthrough: false }) res: Response) {
    await this.maintenance.streamExportZip(res);
  }

  @Post('backup/import')
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 220 * 1024 * 1024 },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const d = join(tmpdir(), `fs-up-${randomBytes(8).toString('hex')}`);
          mkdirSync(d, { recursive: true });
          cb(null, d);
        },
        filename: (_req, _file, cb) => cb(null, 'backup.zip'),
      }),
    }),
  )
  async importBackup(@UploadedFile() file: Express.Multer.File) {
    if (!file?.path || !existsSync(file.path)) {
      throw new BadRequestException('ZIP ファイルがありません。');
    }
    const uploadDir = file.destination;
    try {
      return await this.maintenance.importFromZipFilePath(file.path);
    } finally {
      try {
        rmSync(uploadDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
}
