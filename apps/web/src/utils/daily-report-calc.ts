/** 与 API 一致；参数 cashTotalYen 为结算用净额（实点 − 底钱） */

export function totalSalesYen(
  chargeNightPackYen: number,
  productSalesYen: number,
): number {
  return chargeNightPackYen + productSalesYen;
}

export type TaxTier = {
  id: string;
  denominationYen: number;
  sortOrder: number;
  active: boolean;
};

export function tiersSortedActive(tiers: TaxTier[]): TaxTier[] {
  return [...tiers]
    .filter((t) => t.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * 10% 券面额：各券种（枚数 × 面额）合计后再取 10%（整数向下取整）。
 * `tiers` 仅作 id→面额映射，须包含已停用券种以便解析历史数据。
 */
export function taxFreeCardAmountYen(
  tiers: Pick<TaxTier, 'id' | 'denominationYen'>[],
  countsByTierId: Record<string, number>,
): number {
  const byId = new Map(tiers.map((t) => [t.id, t.denominationYen]));
  let base = 0;
  for (const [id, rawC] of Object.entries(countsByTierId)) {
    const c = Math.max(0, Math.floor(Number(rawC)) || 0);
    if (c === 0) continue;
    const den = byId.get(id);
    if (den == null) continue;
    base += c * den;
  }
  return Math.floor((base * 10) / 100);
}

/** 展示用：面额 × 枚数（仅正枚数） */
export function formatCouponCountsLine(
  tiers: Pick<TaxTier, 'id' | 'denominationYen'>[],
  countsByTierId: Record<string, unknown>,
): string {
  const byId = new Map(tiers.map((t) => [t.id, t.denominationYen]));
  const parts: string[] = [];
  for (const [id, raw] of Object.entries(countsByTierId)) {
    const n =
      typeof raw === 'number' && Number.isFinite(raw)
        ? Math.trunc(raw)
        : parseInt(String(raw), 10);
    if (!Number.isFinite(n) || n <= 0) continue;
    const den = byId.get(id);
    parts.push(
      den != null
        ? `${den.toLocaleString('ja-JP')} 円×${n} 枚`
        : `（不明券種）×${n} 枚`,
    );
  }
  return parts.length ? parts.join('　') : '—';
}

export function deviationYen(
  totalSales: number,
  newageYen: number,
  airpayQrYen: number,
  cashTotalYen: number,
  taxFreeCardAmountYen: number,
): number {
  return (
    newageYen +
    airpayQrYen +
    cashTotalYen +
    taxFreeCardAmountYen -
    totalSales
  );
}

/** 与 API 的 `deviationYenFromStoredFields` 一致：按已存字段重算偏差 */
export function deviationYenFromStoredFields(row: {
  chargeNightPackYen: number;
  productSalesYen: number;
  newageYen: number;
  airpayQrYen: number;
  cashTotalYen: number;
  taxFreeCardAmountYen: number;
}): number {
  const ts = totalSalesYen(row.chargeNightPackYen, row.productSalesYen);
  return deviationYen(
    ts,
    row.newageYen,
    row.airpayQrYen,
    row.cashTotalYen,
    row.taxFreeCardAmountYen,
  );
}
