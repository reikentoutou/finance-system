const MINUTES_PER_DAY = 24 * 60;

export function parseHmToMinute(s: string): number {
  const [h, m] = s.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/** 当日分钟数 → HH:mm（用于与 el-time-select 一致） */
export function minuteToHm(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 跨日默认：钟面终了 ≤ 开始时，把终了设为「开始 + add 分」按次日取模（与 API assertValidRange 一致） */
export function wrapEndAfterStart(startMin: number, endMin: number, add = 60): number {
  if (endMin > startMin) return endMin;
  let next = (startMin + add) % MINUTES_PER_DAY;
  if (next === startMin) next = (startMin + 1) % MINUTES_PER_DAY;
  return next;
}
