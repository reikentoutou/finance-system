import { DateTime } from 'luxon';

export function todayTokyo(): string {
  return DateTime.now().setZone('Asia/Tokyo').toISODate()!;
}

export function minutesToLabel(start: number, end: number): string {
  const sh = Math.floor(start / 60);
  const sm = start % 60;
  const eh = Math.floor(end / 60);
  const em = end % 60;
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${p(sh)}:${p(sm)}–${p(eh)}:${p(em)}`;
}

/** el-time-picker value Date -> minute of day */
export function dateToMinute(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function minuteToDate(m: number, base: Date): Date {
  const x = new Date(base);
  x.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return x;
}
