import { TaxFreeCardTier } from '@prisma/client';

/** 総売上 */
export function totalSalesYen(
  chargeNightPackYen: number,
  productSalesYen: number,
): number {
  return chargeNightPackYen + productSalesYen;
}

/**
 * 免税カード額：各档 (枚数 × 面额) の合計に対し 10%（整数、切り捨て）
 */
export function taxFreeCardAmountYen(
  tiers: Pick<TaxFreeCardTier, 'denominationYen' | 'sortOrder'>[],
  counts: [number, number, number],
): number {
  const sorted = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  let base = 0;
  for (let i = 0; i < 3; i++) {
    const t = sorted[i];
    if (!t) continue;
    base += counts[i] * t.denominationYen;
  }
  return Math.floor((base * 10) / 100);
}

/**
 * 偏差：Newage + Airpay+QR + 現金合計 + 免税カード額 − 総売上
 * 現金合計＝レジ実点（底銭込）− レジ底銭（API には控除後の net を cashTotalYen で保存）
 * 負のとき理由必須
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
 * 一覧・集計・导出用：按当前保存的明细重算偏差（与 create/update 时公式一致）。
 * 避免历史行里 deviationYen 与 cashTotalYen 等字段不同步时出现错显。
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
