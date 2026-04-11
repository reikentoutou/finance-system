import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  deviationYen,
  taxFreeCardAmountYen,
  totalSalesYen,
} from '../calc/daily-report-calc';
import { addCalendarDays } from '../common/calendar-date';
import { assertValidRange, labelFromMinutes } from './time-range';

export type AuthUser = { userId: string; role: Role };

@Injectable()
export class DailyReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async computeAndValidate(
    data: {
      chargeNightPackYen: number;
      productSalesYen: number;
      taxFreeTier1Count: number;
      taxFreeTier2Count: number;
      taxFreeTier3Count: number;
      newageYen: number;
      airpayQrYen: number;
      cashTotalYen: number;
      deviationReason: string | null | undefined;
    },
    tiers: { denominationYen: number; sortOrder: number }[],
  ) {
    const ts = totalSalesYen(data.chargeNightPackYen, data.productSalesYen);
    const taxFree = taxFreeCardAmountYen(tiers, [
      data.taxFreeTier1Count,
      data.taxFreeTier2Count,
      data.taxFreeTier3Count,
    ]);
    const dev = deviationYen(
      ts,
      data.newageYen,
      data.airpayQrYen,
      data.cashTotalYen,
      taxFree,
    );
    if (dev < 0) {
      const reason = data.deviationReason?.trim();
      if (!reason) {
        throw new BadRequestException(
          'deviationReason is required when deviation is negative',
        );
      }
    }
    return {
      totalSalesYen: ts,
      taxFreeCardAmountYen: taxFree,
      deviationYen: dev,
    };
  }

  async create(
    user: AuthUser,
    dto: {
      reportDate: string;
      shiftId: string;
      responsiblePersonId: string;
      startMinuteOfDay: number;
      endMinuteOfDay: number;
      chargeNightPackYen: number;
      productSalesYen: number;
      taxFreeTier1Count: number;
      taxFreeTier2Count: number;
      taxFreeTier3Count: number;
      newageYen: number;
      airpayQrYen: number;
      cashTotalYen: number;
      deviationReason?: string;
      createdByUserId?: string;
    },
  ) {
    assertValidRange(dto.startMinuteOfDay, dto.endMinuteOfDay);
    let createdByUserId = user.userId;
    if (user.role === Role.ADMIN) {
      if (!dto.createdByUserId) {
        throw new BadRequestException('createdByUserId required for admin POST');
      }
      const wm = await this.prisma.user.findFirst({
        where: { id: dto.createdByUserId, role: Role.WEBMASTER },
      });
      if (!wm) throw new BadRequestException('createdByUserId must be WEBMASTER');
      createdByUserId = dto.createdByUserId;
    }

    const [shift, person, tiers] = await Promise.all([
      this.prisma.shift.findUnique({ where: { id: dto.shiftId } }),
      this.prisma.responsiblePerson.findFirst({
        where: { id: dto.responsiblePersonId, active: true },
      }),
      this.prisma.taxFreeCardTier.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    if (!shift?.active) throw new BadRequestException('Invalid shift');
    if (!person) throw new BadRequestException('Invalid responsible person');

    const computed = await this.computeAndValidate(
      {
        chargeNightPackYen: dto.chargeNightPackYen,
        productSalesYen: dto.productSalesYen,
        taxFreeTier1Count: dto.taxFreeTier1Count,
        taxFreeTier2Count: dto.taxFreeTier2Count,
        taxFreeTier3Count: dto.taxFreeTier3Count,
        newageYen: dto.newageYen,
        airpayQrYen: dto.airpayQrYen,
        cashTotalYen: dto.cashTotalYen,
        deviationReason: dto.deviationReason,
      },
      tiers,
    );

    const existing = await this.prisma.dailyReport.findUnique({
      where: {
        reportDate_shiftId: {
          reportDate: dto.reportDate,
          shiftId: dto.shiftId,
        },
      },
    });
    if (existing) {
      throw new BadRequestException('Report already exists for this date/shift');
    }

    return this.prisma.dailyReport.create({
      data: {
        reportDate: dto.reportDate,
        shiftId: dto.shiftId,
        shiftNameSnapshot: shift.name,
        responsiblePersonId: person.id,
        responsiblePersonSnapshot: person.name,
        startMinuteOfDay: dto.startMinuteOfDay,
        endMinuteOfDay: dto.endMinuteOfDay,
        timeRangeLabelSnapshot: labelFromMinutes(
          dto.startMinuteOfDay,
          dto.endMinuteOfDay,
        ),
        chargeNightPackYen: dto.chargeNightPackYen,
        productSalesYen: dto.productSalesYen,
        taxFreeTier1Count: dto.taxFreeTier1Count,
        taxFreeTier2Count: dto.taxFreeTier2Count,
        taxFreeTier3Count: dto.taxFreeTier3Count,
        newageYen: dto.newageYen,
        airpayQrYen: dto.airpayQrYen,
        cashTotalYen: dto.cashTotalYen,
        deviationReason: dto.deviationReason?.trim() || null,
        ...computed,
        status: 'approved',
        createdByUserId,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: Partial<{
    reportDate: string;
    shiftId: string;
    responsiblePersonId: string;
    startMinuteOfDay: number;
    endMinuteOfDay: number;
    chargeNightPackYen: number;
    productSalesYen: number;
    taxFreeTier1Count: number;
    taxFreeTier2Count: number;
    taxFreeTier3Count: number;
    newageYen: number;
    airpayQrYen: number;
    cashTotalYen: number;
    deviationReason?: string;
  }>) {
    const row = await this.prisma.dailyReport.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    if (user.role === Role.WEBMASTER && row.createdByUserId !== user.userId) {
      throw new ForbiddenException();
    }

    const next = {
      reportDate: dto.reportDate ?? row.reportDate,
      shiftId: dto.shiftId ?? row.shiftId,
      responsiblePersonId: dto.responsiblePersonId ?? row.responsiblePersonId,
      startMinuteOfDay: dto.startMinuteOfDay ?? row.startMinuteOfDay,
      endMinuteOfDay: dto.endMinuteOfDay ?? row.endMinuteOfDay,
      chargeNightPackYen: dto.chargeNightPackYen ?? row.chargeNightPackYen,
      productSalesYen: dto.productSalesYen ?? row.productSalesYen,
      taxFreeTier1Count: dto.taxFreeTier1Count ?? row.taxFreeTier1Count,
      taxFreeTier2Count: dto.taxFreeTier2Count ?? row.taxFreeTier2Count,
      taxFreeTier3Count: dto.taxFreeTier3Count ?? row.taxFreeTier3Count,
      newageYen: dto.newageYen ?? row.newageYen,
      airpayQrYen: dto.airpayQrYen ?? row.airpayQrYen,
      cashTotalYen: dto.cashTotalYen ?? row.cashTotalYen,
      deviationReason:
        dto.deviationReason !== undefined
          ? dto.deviationReason
          : row.deviationReason,
    };

    assertValidRange(next.startMinuteOfDay, next.endMinuteOfDay);

    const shift = await this.prisma.shift.findUnique({
      where: { id: next.shiftId },
    });
    const person = await this.prisma.responsiblePerson.findUnique({
      where: { id: next.responsiblePersonId },
    });
    if (!shift?.active) throw new BadRequestException('Invalid shift');
    if (!person?.active) throw new BadRequestException('Invalid responsible person');

    const tiers = await this.prisma.taxFreeCardTier.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    const computed = await this.computeAndValidate(
      {
        chargeNightPackYen: next.chargeNightPackYen,
        productSalesYen: next.productSalesYen,
        taxFreeTier1Count: next.taxFreeTier1Count,
        taxFreeTier2Count: next.taxFreeTier2Count,
        taxFreeTier3Count: next.taxFreeTier3Count,
        newageYen: next.newageYen,
        airpayQrYen: next.airpayQrYen,
        cashTotalYen: next.cashTotalYen,
        deviationReason: next.deviationReason,
      },
      tiers,
    );

    const conflict = await this.prisma.dailyReport.findFirst({
      where: {
        reportDate: next.reportDate,
        shiftId: next.shiftId,
        NOT: { id },
      },
    });
    if (conflict) {
      throw new BadRequestException('Another report exists for this date/shift');
    }

    return this.prisma.dailyReport.update({
      where: { id },
      data: {
        reportDate: next.reportDate,
        shiftId: next.shiftId,
        shiftNameSnapshot: shift.name,
        responsiblePersonId: person.id,
        responsiblePersonSnapshot: person.name,
        startMinuteOfDay: next.startMinuteOfDay,
        endMinuteOfDay: next.endMinuteOfDay,
        timeRangeLabelSnapshot: labelFromMinutes(
          next.startMinuteOfDay,
          next.endMinuteOfDay,
        ),
        chargeNightPackYen: next.chargeNightPackYen,
        productSalesYen: next.productSalesYen,
        taxFreeTier1Count: next.taxFreeTier1Count,
        taxFreeTier2Count: next.taxFreeTier2Count,
        taxFreeTier3Count: next.taxFreeTier3Count,
        newageYen: next.newageYen,
        airpayQrYen: next.airpayQrYen,
        cashTotalYen: next.cashTotalYen,
        deviationReason: next.deviationReason?.trim() || null,
        ...computed,
      },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const row = await this.prisma.dailyReport.findFirst({
      where: {
        id,
        ...(user.role === Role.WEBMASTER
          ? { createdByUserId: user.userId }
          : {}),
      },
      include: { shift: true, createdBy: { select: { id: true, username: true } } },
    });
    if (!row) throw new NotFoundException();
    return row;
  }

  list(
    user: AuthUser,
    q: { from?: string; to?: string; reportDate?: string },
  ) {
    const where: {
      createdByUserId?: string;
      reportDate?: string | { gte?: string; lte?: string };
    } = {};
    if (user.role === Role.WEBMASTER) {
      where.createdByUserId = user.userId;
    }
    if (q.reportDate) {
      where.reportDate = q.reportDate;
    } else if (q.from || q.to) {
      where.reportDate = {};
      if (q.from) where.reportDate.gte = q.from;
      if (q.to) where.reportDate.lte = q.to;
    }
    return this.prisma.dailyReport.findMany({
      where,
      orderBy: [{ reportDate: 'desc' }, { shift: { sortOrder: 'asc' } }],
      include: {
        shift: true,
        createdBy: { select: { id: true, username: true, role: true } },
      },
    });
  }

  /**
   * 业务日 = 白1→白2→夜班→次日早班（reportDate 为「白1 开始日」锚点；末班在次日清晨仍用同一 reportDate）。
   * 默认开始时间 = 上一班已存日报的结束时刻：同 reportDate 内 sortOrder 上一档；若为白1（首档）则取
   * 「前一业务日」最后一档（即昨日账期内的次日早班）的结束时刻。
   * 不按填报人过滤，以便网管在管理员已代填上一班次时仍能带出时间。
   */
  async businessDayHint(reportDate: string, shiftId: string) {
    if (!reportDate?.match(/^\d{4}-\d{2}-\d{2}$/) || !shiftId) {
      return { previousShiftEndMinute: null as number | null };
    }
    const shifts = await this.prisma.shift.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    const idx = shifts.findIndex((s) => s.id === shiftId);
    if (idx < 0 || shifts.length === 0) {
      return { previousShiftEndMinute: null as number | null };
    }

    let prevShiftId: string;
    let prevReportDate: string;
    if (idx === 0) {
      if (shifts.length < 2) {
        return { previousShiftEndMinute: null as number | null };
      }
      prevShiftId = shifts[shifts.length - 1]!.id;
      prevReportDate = addCalendarDays(reportDate, -1);
    } else {
      prevShiftId = shifts[idx - 1]!.id;
      prevReportDate = reportDate;
    }

    const row = await this.prisma.dailyReport.findUnique({
      where: {
        reportDate_shiftId: { reportDate: prevReportDate, shiftId: prevShiftId },
      },
    });
    if (!row) return { previousShiftEndMinute: null as number | null };
    return { previousShiftEndMinute: row.endMinuteOfDay };
  }

  async setPhotoKey(id: string, user: AuthUser, field: 'ddn' | 'taxFree', key: string) {
    const row = await this.prisma.dailyReport.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    if (user.role === Role.WEBMASTER && row.createdByUserId !== user.userId) {
      throw new ForbiddenException();
    }
    return this.prisma.dailyReport.update({
      where: { id },
      data:
        field === 'ddn'
          ? { ddnPhotoKey: key }
          : { taxFreeCardPhotoKey: key },
    });
  }
}
