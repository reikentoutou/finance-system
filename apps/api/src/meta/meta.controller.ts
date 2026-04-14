import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';

class PatchShiftDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class CreatePersonDto {
  @IsString()
  name!: string;
}

class PatchSettingsDto {
  @IsInt()
  @Min(0)
  registerFloatAmount!: number;
}

class CreateTaxFreeTierDto {
  @IsInt()
  @Min(1)
  denominationYen!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

class PatchTaxFreeTierDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  denominationYen?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Controller('meta')
export class MetaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('shifts')
  shifts() {
    return this.prisma.shift.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Patch('shifts')
  @Roles(Role.ADMIN)
  patchShift(@Body() dto: PatchShiftDto) {
    return this.prisma.shift.update({
      where: { id: dto.id },
      data: {
        ...(dto.name != null ? { name: dto.name } : {}),
        ...(dto.active != null ? { active: dto.active } : {}),
      },
    });
  }

  @Get('responsible-persons')
  persons() {
    return this.prisma.responsiblePerson.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  @Post('responsible-persons')
  @Roles(Role.ADMIN)
  createPerson(@Body() dto: CreatePersonDto) {
    return this.prisma.responsiblePerson.create({
      data: { name: dto.name, active: true },
    });
  }

  @Patch('responsible-persons/:id/deactivate')
  @Roles(Role.ADMIN)
  deactivatePerson(@Param('id') id: string) {
    return this.prisma.responsiblePerson.update({
      where: { id },
      data: { active: false },
    });
  }

  /** 日报表单与计算用：含已停用券种（解析历史 id 面额、编辑预览） */
  @Get('tax-tiers')
  tiers() {
    return this.prisma.taxFreeCardTier.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Post('tax-tiers')
  @Roles(Role.ADMIN)
  async createTaxTier(@Body() dto: CreateTaxFreeTierDto) {
    const max = await this.prisma.taxFreeCardTier.aggregate({
      _max: { sortOrder: true },
    });
    const sortOrder =
      dto.sortOrder ?? ((max._max.sortOrder ?? 0) + 1);
    return this.prisma.taxFreeCardTier.create({
      data: {
        denominationYen: dto.denominationYen,
        sortOrder,
        active: true,
      },
    });
  }

  @Patch('tax-tiers')
  @Roles(Role.ADMIN)
  patchTaxTier(@Body() dto: PatchTaxFreeTierDto) {
    return this.prisma.taxFreeCardTier.update({
      where: { id: dto.id },
      data: {
        ...(dto.denominationYen != null
          ? { denominationYen: dto.denominationYen }
          : {}),
        ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.active != null ? { active: dto.active } : {}),
      },
    });
  }

  @Get('webmaster-users')
  @Roles(Role.ADMIN)
  webmasterUsers() {
    return this.prisma.user.findMany({
      where: { role: Role.WEBMASTER },
      select: { id: true, username: true },
    });
  }

  @Get('settings')
  settings() {
    return this.prisma.appSettings.findUnique({ where: { id: 'default' } });
  }

  @Patch('settings')
  @Roles(Role.ADMIN)
  patchSettings(@Body() dto: PatchSettingsDto) {
    return this.prisma.appSettings.update({
      where: { id: 'default' },
      data: { registerFloatAmount: dto.registerFloatAmount },
    });
  }
}
