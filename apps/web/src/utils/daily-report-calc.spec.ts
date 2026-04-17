import { describe, expect, it } from 'vitest';
import {
  chargeNightPackExcludedFromIncluded,
  chargeNightPackTaxIncludedFromExcluded,
  deviationYen,
  deviationYenFromStoredFields,
  taxFreeCardAmountYen,
  totalSalesYen,
  totalSalesYenFromStoredTaxIncluded,
  type TaxTier,
} from './daily-report-calc';

describe('chargeNightPackTaxIncludedFromExcluded', () => {
  it('税抜→税込（×1.1 四捨五入）', () => {
    expect(chargeNightPackTaxIncludedFromExcluded(10000)).toBe(11000);
    expect(chargeNightPackTaxIncludedFromExcluded(0)).toBe(0);
  });
});

describe('chargeNightPackExcludedFromIncluded', () => {
  it('税込→税抜（編集時の表示用）', () => {
    expect(chargeNightPackExcludedFromIncluded(11000)).toBe(10000);
  });
});

describe('totalSalesYen', () => {
  it('チャージ税抜＋商品税込', () => {
    expect(totalSalesYen(10000, 5000)).toBe(16000);
  });
});

describe('totalSalesYenFromStoredTaxIncluded', () => {
  it('DB 行は税込＋税込', () => {
    expect(totalSalesYenFromStoredTaxIncluded(11000, 5000)).toBe(16000);
  });
});

describe('taxFreeCardAmountYen', () => {
  const tiers: Pick<TaxTier, 'id' | 'denominationYen'>[] = [
    { id: 'a', denominationYen: 1000 },
  ];
  it('枚数×面額の合計の 10% を切り捨て', () => {
    expect(taxFreeCardAmountYen(tiers, { a: 2 })).toBe(200);
  });
});

describe('deviationYen', () => {
  it('総売上・底銭を含む式', () => {
    expect(deviationYen(10000, 0, 0, 0, 0, 30000)).toBe(-40000);
  });
});

describe('deviationYenFromStoredFields', () => {
  it('行データから再計算', () => {
    const row = {
      chargeNightPackYen: 11000,
      productSalesYen: 0,
      newageYen: 0,
      airpayQrYen: 0,
      cashTotalYen: 0,
      taxFreeCardAmountYen: 0,
    };
    expect(deviationYenFromStoredFields(row, 30000)).toBe(-41000);
  });
});
