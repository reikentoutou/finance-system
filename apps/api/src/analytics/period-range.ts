import { DateTime } from 'luxon';
import { BadRequestException } from '@nestjs/common';

export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year';

export function tokyoRange(
  period: Period,
  anchorISO: string,
): { start: string; end: string } {
  const d = DateTime.fromISO(anchorISO, { zone: 'Asia/Tokyo' });
  if (!d.isValid) throw new BadRequestException('Invalid anchorDate');

  switch (period) {
    case 'day': {
      const iso = d.toISODate()!;
      return { start: iso, end: iso };
    }
    case 'week': {
      const weekday = d.weekday;
      const monday = d.minus({ days: weekday - 1 }).startOf('day');
      const sunday = monday.plus({ days: 6 }).endOf('day');
      return { start: monday.toISODate()!, end: sunday.toISODate()! };
    }
    case 'month': {
      const start = d.startOf('month');
      const end = d.endOf('month');
      return { start: start.toISODate()!, end: end.toISODate()! };
    }
    case 'quarter': {
      const q = Math.floor((d.month - 1) / 3);
      const startMonth = q * 3 + 1;
      const start = d.set({ month: startMonth, day: 1 }).startOf('day');
      const end = start.plus({ months: 3 }).minus({ days: 1 }).endOf('day');
      return { start: start.toISODate()!, end: end.toISODate()! };
    }
    case 'year': {
      const start = d.startOf('year');
      const end = d.endOf('year');
      return { start: start.toISODate()!, end: end.toISODate()! };
    }
    default:
      throw new BadRequestException('Invalid period');
  }
}
