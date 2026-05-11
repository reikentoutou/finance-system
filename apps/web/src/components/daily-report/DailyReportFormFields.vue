<script setup lang="ts">
import type { TaxTier } from '@/utils/daily-report-calc';
import { REPORT_TAX_FREE_ACCEPT } from '@/composables/useReportAttachmentFiles';
import DailyReportAttachmentFields from './DailyReportAttachmentFields.vue';
import DailyReportBasicFields from './DailyReportBasicFields.vue';
import DailyReportMemoFields from './DailyReportMemoFields.vue';
import DailyReportSalesFields from './DailyReportSalesFields.vue';
import DailyReportSubmitterFields from './DailyReportSubmitterFields.vue';
import type {
  DailyReportFormFieldsModel,
  ResponsiblePersonOption,
  WebmasterOption,
} from './daily-report-form.types';

withDefaults(
  defineProps<{
    form: DailyReportFormFieldsModel;
    persons: ResponsiblePersonOption[];
    activeTiersSorted: TaxTier[];
    registerFloatAmount: number;
    cashNetForReport: number;
    deviationYenPreview: number;
    savedDdnPhotoKey: string | null;
    savedTaxFreePhotoKey: string | null;
    ddnFile: File | null;
    taxFile: File | null;
    photoAccept: string;
    taxFreePhotoAccept?: string;
    couponEmptyHint: string;
    variant: 'wm' | 'admin';
    showWmTimeHint?: boolean;
    startTimeFromPreviousShift?: boolean;
    showWebmasterSelect?: boolean;
    webmasters?: WebmasterOption[];
  }>(),
  {
    taxFreePhotoAccept: REPORT_TAX_FREE_ACCEPT,
  },
);

const createdByUserId = defineModel<string>('createdByUserId', {
  required: false,
});

defineEmits<{
  pickDdn: [e: Event];
  pickTax: [e: Event];
  confirm: [];
}>();
</script>

<template>
  <div class="daily-report-form-fields">
    <DailyReportSubmitterFields
      v-if="showWebmasterSelect"
      v-model:created-by-user-id="createdByUserId"
      :webmasters="webmasters"
    />

    <DailyReportBasicFields
      :form="form"
      :persons="persons"
      :variant="variant"
      :show-wm-time-hint="showWmTimeHint"
      :start-time-from-previous-shift="startTimeFromPreviousShift"
    />

    <DailyReportSalesFields
      :form="form"
      :active-tiers-sorted="activeTiersSorted"
      :register-float-amount="registerFloatAmount"
      :cash-net-for-report="cashNetForReport"
      :coupon-empty-hint="couponEmptyHint"
    />

    <DailyReportMemoFields
      :form="form"
      :deviation-yen-preview="deviationYenPreview"
    />

    <DailyReportAttachmentFields
      :saved-ddn-photo-key="savedDdnPhotoKey"
      :saved-tax-free-photo-key="savedTaxFreePhotoKey"
      :ddn-file="ddnFile"
      :tax-file="taxFile"
      :photo-accept="photoAccept"
      :tax-free-photo-accept="taxFreePhotoAccept"
      @pick-ddn="$emit('pickDdn', $event)"
      @pick-tax="$emit('pickTax', $event)"
    />

    <div class="actions">
      <el-button type="primary" size="large" class="confirm-btn" @click="$emit('confirm')">
        入力内容を確認
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.daily-report-form-fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.actions {
  padding-top: 4px;
}

.confirm-btn {
  width: 100%;
  max-width: 360px;
  font-weight: 700;
}

@media (prefers-reduced-motion: no-preference) {
  .confirm-btn:not(:disabled):active {
    transform: translateY(1px);
  }

  .confirm-btn {
    transition: transform 0.12s var(--fs-ease-out, cubic-bezier(0.25, 1, 0.5, 1));
  }
}
</style>
