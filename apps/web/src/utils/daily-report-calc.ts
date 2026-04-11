/** 与 API 一致；引数 cashTotalYen は精算用（実点−底銭）の net */

export function totalSalesYen(
  chargeNightPackYen: number,
  productSalesYen: number,
): number {
  return chargeNightPackYen + productSalesYen;
}

export type TaxTier = { denominationYen: number; sortOrder: number };

export function taxFreeCardAmountYen(
  tiers: TaxTier[],
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

/** 与 API `deviationYenFromStoredFields` 一致：按已存明细重算偏差 */
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
