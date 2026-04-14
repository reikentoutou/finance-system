import { tiersSortedActive, type TaxTier } from '@/utils/daily-report-calc';

/** 与有效券种对齐：删除无效 key、缺失补 0 */
export function syncCouponFormKeys(
  taxFreeCouponCounts: Record<string, number>,
  taxTiers: readonly TaxTier[],
): void {
  const active = tiersSortedActive([...taxTiers]);
  for (const k of Object.keys(taxFreeCouponCounts)) {
    if (!active.some((t) => t.id === k)) {
      delete taxFreeCouponCounts[k];
    }
  }
  for (const t of active) {
    if (taxFreeCouponCounts[t.id] === undefined) {
      taxFreeCouponCounts[t.id] = 0;
    }
  }
}

export function parseServerCouponBaseline(
  raw: Record<string, unknown>,
): Record<string, number> {
  const baseline: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const n =
      typeof v === 'number' && Number.isFinite(v)
        ? Math.trunc(v)
        : parseInt(String(v), 10);
    if (Number.isFinite(n) && n >= 0) baseline[k] = n;
  }
  return baseline;
}

/** 将 API 返回的 taxFreeCouponCounts 写入表单中各有效 tier 的枚数 */
export function applyTaxFreeCountsFromRawToForm(
  formCounts: Record<string, number>,
  raw: Record<string, unknown>,
  activeTiersSorted: readonly TaxTier[],
): void {
  for (const t of activeTiersSorted) {
    const v = raw[t.id];
    const n =
      typeof v === 'number' && Number.isFinite(v)
        ? Math.trunc(v)
        : parseInt(String(v), 10);
    formCounts[t.id] = Number.isFinite(n) && n >= 0 ? n : 0;
  }
}
