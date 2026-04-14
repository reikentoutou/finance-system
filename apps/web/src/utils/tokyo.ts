import { DateTime } from 'luxon';

export function todayTokyo(): string {
  return DateTime.now().setZone('Asia/Tokyo').toISODate()!;
}

/** 东京日历：从今天往前推若干月（用于日报列表默认区间） */
export function isoMonthsAgoTokyo(months: number): string {
  return DateTime.now()
    .setZone('Asia/Tokyo')
    .minus({ months })
    .toISODate()!;
}

export function minutesToLabel(start: number, end: number): string {
  const sh = Math.floor(start / 60);
  const sm = start % 60;
  const eh = Math.floor(end / 60);
  const em = end % 60;
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${p(sh)}:${p(sm)}–${p(eh)}:${p(em)}`;
}

/** 将 el-time-picker 的 Date 转为当日 0 点起的分钟数 */
export function dateToMinute(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function minuteToDate(m: number, base: Date): Date {
  const x = new Date(base);
  x.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return x;
}
