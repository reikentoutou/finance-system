import { computed, type ComputedRef, type Ref, type Reactive } from 'vue';
import {
  deviationYen,
  taxFreeCardAmountYen,
  totalSalesYen,
  type TaxTier,
} from '@/utils/daily-report-calc';

type FormSlice = {
  chargeNightPackYen: number;
  productSalesYen: number;
  taxFreeTier1Count: number;
  taxFreeTier2Count: number;
  taxFreeTier3Count: number;
  newageYen: number;
  airpayQrYen: number;
};

/** 网管 / 管理员日报表单共用的预览（与 apps/api/src/calc/daily-report-calc 一致） */
export function useDailyReportPreview(
  form: Reactive<FormSlice>,
  taxTiers: Ref<TaxTier[]>,
  cashNetForReport: ComputedRef<number>,
) {
  return computed(() => {
    const ts = totalSalesYen(form.chargeNightPackYen, form.productSalesYen);
    const taxFree = taxFreeCardAmountYen(taxTiers.value, [
      form.taxFreeTier1Count,
      form.taxFreeTier2Count,
      form.taxFreeTier3Count,
    ]);
    const dev = deviationYen(
      ts,
      form.newageYen,
      form.airpayQrYen,
      cashNetForReport.value,
      taxFree,
    );
    return {
      totalSalesYen: ts,
      taxFreeCardAmountYen: taxFree,
      deviationYen: dev,
      cashNetYen: cashNetForReport.value,
    };
  });
}
