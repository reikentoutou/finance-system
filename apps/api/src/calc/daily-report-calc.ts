import { TaxFreeCardTier } from '@prisma/client';

/**
 * フォーム/API 受信：チャージ・ナイトは税抜円 → 10% 加算して税込（四捨五入）。
 * DB・集計では税込を保存する。
 */
export function chargeNightPackTaxIncludedFromExcluded(excludedYen: number): number {
  const n = Math.max(0, Math.floor(Number(excludedYen)) || 0);
  return Math.round((n * 11) / 10);
}

/** 総売上（税込）：chargeNightPackYen・productSalesYen はいずれも税込円（DB 行と同じ口径）。 */
export function totalSalesYen(
  chargeNightPackTaxIncluded: number,
  productSalesTaxIncluded: number,
): number {
  return chargeNightPackTaxIncluded + productSalesTaxIncluded;
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
 * 偏差：Newage + Airpay+QR + レジ実点（ユーザー入力・底銭込）+ 10% 券面額 − 総売上 − レジ底銭。
 * cashTotalYen は DB に保存する実点（底銭込）円。底銭は設定の registerFloatYen。
 * 为负时须填理由（由上层校验）。
 */
export function deviationYen(
  totalSales: number,
  newageYen: number,
  airpayQrYen: number,
  cashInDrawerGrossYen: number,
  taxFreeCardAmountYen: number,
  registerFloatYen: number,
): number {
  return (
    newageYen +
    airpayQrYen +
    cashInDrawerGrossYen +
    taxFreeCardAmountYen -
    totalSales -
    registerFloatYen
  );
}

/**
 * 列表/汇总/导出用：按已存字段重算偏差（与 create/update 时公式一致）。
 * registerFloatYen は現在の AppSettings に合わせる（履歴行の実点は cashTotalYen に保存済み）。
 */
export function deviationYenFromStoredFields(
  row: {
    chargeNightPackYen: number;
    productSalesYen: number;
    newageYen: number;
    airpayQrYen: number;
    cashTotalYen: number;
    taxFreeCardAmountYen: number;
  },
  registerFloatYen: number,
): number {
  const ts = totalSalesYen(row.chargeNightPackYen, row.productSalesYen);
  return deviationYen(
    ts,
    row.newageYen,
    row.airpayQrYen,
    row.cashTotalYen,
    row.taxFreeCardAmountYen,
    registerFloatYen,
  );
}
