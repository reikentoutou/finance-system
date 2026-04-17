import { computed, type ComputedRef, type Ref, type Reactive } from 'vue';
import {
  chargeNightPackTaxIncludedFromExcluded,
  deviationYen,
  taxFreeCardAmountYen,
  totalSalesYen,
  type TaxTier,
} from '@/utils/daily-report-calc';

type FormSlice = {
  chargeNightPackYen: number;
  productSalesYen: number;
  newageYen: number;
  airpayQrYen: number;
  cashInDrawerYen: number;
};

/** 网管/管理员日报表单共用预览逻辑（与 apps/api 的 daily-report-calc 一致） */
export function useDailyReportPreview(
  form: Reactive<FormSlice>,
  taxTiers: Ref<TaxTier[]>,
  registerFloatAmount: Ref<number>,
  couponCountsForPreview: ComputedRef<Record<string, number>>,
) {
  return computed(() => {
    const chargeNightPackTaxIncludedYen = chargeNightPackTaxIncludedFromExcluded(
      form.chargeNightPackYen,
    );
    const ts = totalSalesYen(form.chargeNightPackYen, form.productSalesYen);
    const taxFree = taxFreeCardAmountYen(
      taxTiers.value,
      couponCountsForPreview.value,
    );
    const dev = deviationYen(
      ts,
      form.newageYen,
      form.airpayQrYen,
      form.cashInDrawerYen,
      taxFree,
      registerFloatAmount.value,
    );
    const cashNetYen = Math.max(
      0,
      form.cashInDrawerYen - registerFloatAmount.value,
    );
    return {
      chargeNightPackTaxIncludedYen,
      totalSalesYen: ts,
      taxFreeCardAmountYen: taxFree,
      deviationYen: dev,
      cashNetYen,
    };
  });
}
