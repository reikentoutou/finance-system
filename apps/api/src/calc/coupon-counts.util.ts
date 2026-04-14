import { BadRequestException } from '@nestjs/common';

/** 将请求体或 DB 中的 Json 规范化为非负整数枚数 */
export function normalizeCouponCountsInput(raw: unknown): Record<string, number> {
  if (raw == null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k !== 'string' || !k.trim()) continue;
    const n =
      typeof v === 'number' && Number.isFinite(v)
        ? Math.trunc(v)
        : parseInt(String(v), 10);
    if (!Number.isFinite(n) || n < 0) {
      throw new BadRequestException(`Invalid coupon count for tier ${k}`);
    }
    out[k] = n;
  }
  return out;
}

/** 提交时：枚数 key 仅允许为当前有效券种 id */
export function assertCountsOnlyActiveTiers(
  counts: Record<string, number>,
  activeTierIds: Set<string>,
): void {
  for (const id of Object.keys(counts)) {
    if (!activeTierIds.has(id)) {
      throw new BadRequestException(`Unknown or inactive coupon tier id: ${id}`);
    }
  }
}

/** 已存 Json：key 须为券种主数据中存在过的 id（允许含已停用券种的历史 key） */
export function assertCountsKeysKnownToTiers(
  counts: Record<string, number>,
  knownTierIds: Set<string>,
): void {
  for (const id of Object.keys(counts)) {
    if (!knownTierIds.has(id)) {
      throw new BadRequestException(`Unknown coupon tier id: ${id}`);
    }
  }
}

/**
 * 新建写入前：将保存用 Json 的 key 固定为「仅有效券种、按 sortOrder、缺失补 0」。
 * 避免客户端只传部分 key 时与计算、再读取不一致。
 */
export function canonicalActiveCouponCounts(
  counts: Record<string, number>,
  activeTierIdsInOrder: string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of activeTierIdsInOrder) {
    out[id] = counts[id] ?? 0;
  }
  return out;
}
