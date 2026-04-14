import { BadRequestException } from '@nestjs/common';

/** 0–1439 分（当日 00:00 起算），结束最大 23:59 */
export const MAX_MINUTE = 23 * 60 + 59;

export function labelFromMinutes(start: number, end: number): string {
  const sh = Math.floor(start / 60);
  const sm = start % 60;
  const eh = Math.floor(end / 60);
  const em = end % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(sh)}:${pad(sm)}–${pad(eh)}:${pad(em)}`;
}

/**
 * 开始、结束均为「当日钟面」分钟数（0–1439）。
 * 当结束 < 开始时视为跨午夜（结束在次日），仍属有效范围。
 */
export function assertValidRange(start: number, end: number) {
  if (start < 0 || start > MAX_MINUTE || end < 0 || end > MAX_MINUTE) {
    throw new BadRequestException('Time out of range');
  }
  if (start === end) {
    throw new BadRequestException('Start and end must differ');
  }
}
