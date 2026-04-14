import { TaxFreeCardTier } from '@prisma/client';

/** 总销售额 */
export function totalSalesYen(
  chargeNightPackYen: number,
  productSalesYen: number,
): number {
  return chargeNightPackYen + productSalesYen;
}

/**
 * 10% 券面额：各券种（枚数 × 面额）合计后再取 10%（整数向下取整）。
 * `tiers` 仅作 id→面额映射，须含已停用券种以便解析历史 JSON 中的 id。
 */
export function taxFreeCardAmountYen(
  tiers: Pick<TaxFreeCardTier, 'id' | 'denominationYen'>[],
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

/**
 * 偏差：Newage + Airpay+QR + 现金合计 + 10% 券面额 − 总销售额。
 * 现金合计 = 收银实点（含底钱）− 底钱（API 以 cashTotalYen 存扣减后的净值）。
 * 为负时须填理由（由上层校验）。
 */
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

/**
 * 列表/汇总/导出用：按已存字段重算偏差（与 create/update 时公式一致）。
 * 避免历史行 deviationYen 与 cashTotalYen 等不一致时出现错误展示。
 */
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
