import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Express } from 'express';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertCountsKeysKnownToTiers,
  assertCountsOnlyActiveTiers,
  canonicalActiveCouponCounts,
  normalizeCouponCountsInput,
} from '../calc/coupon-counts.util';
import {
  getUploadDir,
  safeUnlinkUploadByKey,
} from '../uploads/upload-storage.util';
import {
  chargeNightPackTaxIncludedFromExcluded,
  deviationYen,
  taxFreeCardAmountYen,
  totalSalesYen,
} from '../calc/daily-report-calc';
import { assertValidRange, labelFromMinutes } from './time-range';

/** 与 `TaxFreeCardTier` 表字段一致（显式形状，避免 Client 与 schema 不同步时的推断偏差）。 */
type TaxFreeTierRow = {
  id: string;
  denominationYen: number;
  sortOrder: number;
  active: boolean;
};

export type AuthUser = { userId: string; role: Role };

@Injectable()
export class DailyReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 对同一日报的附件 POST 串行化，减轻覆盖写入时的竞态 */
  private readonly photoUploadByReport = new Map<string, Promise<unknown>>();

  private withUploadSerialized<T>(reportId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.photoUploadByReport.get(reportId) ?? Promise.resolve();
    const next = prev.then(() => fn());
    this.photoUploadByReport.set(reportId, next);
    void next.finally(() => {
      if (this.photoUploadByReport.get(reportId) === next) {
        this.photoUploadByReport.delete(reportId);
      }
    });
    return next as Promise<T>;
  }

  /**
   * 在 multer 已落盘之后调用：依次将 DDN / 免税券附件关联到 DB，并删除旧文件。
   */
  async applyUploadedPhotos(
    id: string,
    user: AuthUser,
    files: { ddn?: Express.Multer.File[]; taxFree?: Express.Multer.File[] },
  ) {
    return this.withUploadSerialized(id, async () => {
      const base = '/uploads/';
      let ddnApplied = false;
      let taxFreeApplied = false;
      try {
        if (files.ddn?.[0]) {
          await this.setPhotoKey(id, user, 'ddn', base + files.ddn[0].filename);
          ddnApplied = true;
        }
        if (files.taxFree?.[0]) {
          await this.setPhotoKey(id, user, 'taxFree', base + files.taxFree[0].filename);
          taxFreeApplied = true;
        }
      } catch (e) {
        const uploadDir = getUploadDir();
        await Promise.all([
          files.ddn?.[0] && !ddnApplied
            ? safeUnlinkUploadByKey(base + files.ddn[0].filename, uploadDir)
            : Promise.resolve(),
          files.taxFree?.[0] && !taxFreeApplied
            ? safeUnlinkUploadByKey(base + files.taxFree[0].filename, uploadDir)
            : Promise.resolve(),
        ]);
        throw e;
      }
      return this.findOne(user, id);
    });
  }

  private computeAndValidate(
    data: {
      chargeNightPackYen: number;
      productSalesYen: number;
      taxFreeCouponCounts: Record<string, number>;
      newageYen: number;
      airpayQrYen: number;
      /** レジ実点（底銭込）— ユーザー入力 */
      cashTotalYen: number;
      deviationReason: string | null | undefined;
    },
    allTiers: { id: string; denominationYen: number; active: boolean }[],
    registerFloatYen: number,
    opts?: { allowInactiveStoredTierKeys?: boolean },
  ) {
    const activeIds = new Set(
      allTiers.filter((t) => t.active).map((t) => t.id),
    );
    const knownIds = new Set(allTiers.map((t) => t.id));
    assertCountsKeysKnownToTiers(data.taxFreeCouponCounts, knownIds);
    if (!opts?.allowInactiveStoredTierKeys) {
      assertCountsOnlyActiveTiers(data.taxFreeCouponCounts, activeIds);
    }
    const ts = totalSalesYen(data.chargeNightPackYen, data.productSalesYen);
    const taxFree = taxFreeCardAmountYen(allTiers, data.taxFreeCouponCounts);
    const dev = deviationYen(
      ts,
      data.newageYen,
      data.airpayQrYen,
      data.cashTotalYen,
      taxFree,
      registerFloatYen,
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
      taxFreeCouponCounts: Record<string, unknown>;
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

    const [shift, person, tiersLoaded] = await Promise.all([
      this.prisma.shift.findUnique({ where: { id: dto.shiftId } }),
      this.prisma.responsiblePerson.findFirst({
        where: { id: dto.responsiblePersonId, active: true },
      }),
      this.prisma.taxFreeCardTier.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    const allTiers = tiersLoaded as TaxFreeTierRow[];
    if (!shift?.active) throw new BadRequestException('Invalid shift');
    if (!person) throw new BadRequestException('Invalid responsible person');

    const activeTierIds = allTiers
      .filter((t) => t.active)
      .map((t) => t.id);
    const countsNorm = normalizeCouponCountsInput(dto.taxFreeCouponCounts);
    assertCountsOnlyActiveTiers(countsNorm, new Set(activeTierIds));
    const counts = canonicalActiveCouponCounts(countsNorm, activeTierIds);

    const settings = await this.prisma.appSettings.findUnique({
      where: { id: 'default' },
    });
    const registerFloatYen = settings?.registerFloatAmount ?? 0;

    const chargeNightPackTaxIncluded = chargeNightPackTaxIncludedFromExcluded(
      dto.chargeNightPackYen,
    );

    const computed = this.computeAndValidate(
      {
        chargeNightPackYen: chargeNightPackTaxIncluded,
        productSalesYen: dto.productSalesYen,
        taxFreeCouponCounts: counts,
        newageYen: dto.newageYen,
        airpayQrYen: dto.airpayQrYen,
        cashTotalYen: dto.cashTotalYen,
        deviationReason: dto.deviationReason,
      },
      allTiers,
      registerFloatYen,
      { allowInactiveStoredTierKeys: false },
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
        chargeNightPackYen: chargeNightPackTaxIncluded,
        productSalesYen: dto.productSalesYen,
        taxFreeCouponCounts: counts as Prisma.InputJsonValue,
        newageYen: dto.newageYen,
        airpayQrYen: dto.airpayQrYen,
        cashTotalYen: dto.cashTotalYen,
        deviationReason: dto.deviationReason?.trim() || null,
        ...computed,
        status: 'approved',
        createdByUserId,
      } as unknown as Prisma.DailyReportUncheckedCreateInput,
    });
  }

  async update(
    user: AuthUser,
    id: string,
    dto: Partial<{
      reportDate: string;
      shiftId: string;
      responsiblePersonId: string;
      startMinuteOfDay: number;
      endMinuteOfDay: number;
      chargeNightPackYen: number;
      productSalesYen: number;
      taxFreeCouponCounts: Record<string, unknown>;
      newageYen: number;
      airpayQrYen: number;
      cashTotalYen: number;
      deviationReason?: string;
    }>,
  ) {
    const [rowLoaded, tiersForMergeLoaded] = await Promise.all([
      this.prisma.dailyReport.findUnique({ where: { id } }),
      this.prisma.taxFreeCardTier.findMany({
        orderBy: { sortOrder: 'asc' },
      }),
    ]);
    if (!rowLoaded) throw new NotFoundException();
    const row = rowLoaded as typeof rowLoaded & {
      taxFreeCouponCounts: Prisma.JsonValue | null;
    };
    const allTiersForMerge = tiersForMergeLoaded as TaxFreeTierRow[];
    if (user.role === Role.WEBMASTER) {
      throw new ForbiddenException('Submitted reports cannot be edited');
    }
    const activeIds = new Set(
      allTiersForMerge.filter((t) => t.active).map((t) => t.id),
    );
    const prev = normalizeCouponCountsInput(row.taxFreeCouponCounts);

    let nextCounts: Record<string, number>;
    if (dto.taxFreeCouponCounts !== undefined) {
      const client = normalizeCouponCountsInput(dto.taxFreeCouponCounts);
      assertCountsOnlyActiveTiers(client, activeIds);
      nextCounts = { ...prev };
      for (const id of activeIds) {
        const fromClient = Object.prototype.hasOwnProperty.call(client, id)
          ? client[id]
          : undefined;
        nextCounts[id] =
          fromClient !== undefined ? fromClient : (prev[id] ?? 0);
      }
    } else {
      nextCounts = prev;
    }

    const nextChargeNightPackYen =
      dto.chargeNightPackYen !== undefined
        ? chargeNightPackTaxIncludedFromExcluded(dto.chargeNightPackYen)
        : row.chargeNightPackYen;

    const next = {
      reportDate: dto.reportDate ?? row.reportDate,
      shiftId: dto.shiftId ?? row.shiftId,
      responsiblePersonId: dto.responsiblePersonId ?? row.responsiblePersonId,
      startMinuteOfDay: dto.startMinuteOfDay ?? row.startMinuteOfDay,
      endMinuteOfDay: dto.endMinuteOfDay ?? row.endMinuteOfDay,
      chargeNightPackYen: nextChargeNightPackYen,
      productSalesYen: dto.productSalesYen ?? row.productSalesYen,
      taxFreeCouponCounts: nextCounts,
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

    const settings = await this.prisma.appSettings.findUnique({
      where: { id: 'default' },
    });
    const registerFloatYen = settings?.registerFloatAmount ?? 0;

    const computed = this.computeAndValidate(
      {
        chargeNightPackYen: next.chargeNightPackYen,
        productSalesYen: next.productSalesYen,
        taxFreeCouponCounts: nextCounts,
        newageYen: next.newageYen,
        airpayQrYen: next.airpayQrYen,
        cashTotalYen: next.cashTotalYen,
        deviationReason: next.deviationReason,
      },
      allTiersForMerge,
      registerFloatYen,
      { allowInactiveStoredTierKeys: true },
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
        taxFreeCouponCounts: next.taxFreeCouponCounts as Prisma.InputJsonValue,
        newageYen: next.newageYen,
        airpayQrYen: next.airpayQrYen,
        cashTotalYen: next.cashTotalYen,
        deviationReason: next.deviationReason?.trim() || null,
        ...computed,
      } as unknown as Prisma.DailyReportUncheckedUpdateInput,
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
    q: { from?: string; to?: string; reportDate?: string; limit?: number },
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
      ...(q.limit != null ? { take: q.limit } : {}),
    });
  }

  /**
   * 业务日 = 当日早番→白1→白2→夜番。默认开始时间取同一 reportDate 内上一班的结束时刻；
   * 首班没有上一班，不跨日回看。不按填报人过滤，以便网管在管理员已代填上一班次时仍能带出时间。
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

    if (idx === 0) {
      return { previousShiftEndMinute: null as number | null };
    }
    const prevShiftId = shifts[idx - 1]!.id;

    const row = await this.prisma.dailyReport.findUnique({
      where: {
        reportDate_shiftId: { reportDate, shiftId: prevShiftId },
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
    const oldKey =
      field === 'ddn' ? row.ddnPhotoKey : row.taxFreeCardPhotoKey;
    if (user.role === Role.WEBMASTER && oldKey) {
      throw new ForbiddenException(
        'Submitted report attachments cannot be replaced',
      );
    }
    const updated = await this.prisma.dailyReport.update({
      where: { id },
      data:
        field === 'ddn'
          ? { ddnPhotoKey: key }
          : { taxFreeCardPhotoKey: key },
    });
    if (oldKey && oldKey !== key) {
      await safeUnlinkUploadByKey(oldKey, getUploadDir());
    }
    return updated;
  }
}
