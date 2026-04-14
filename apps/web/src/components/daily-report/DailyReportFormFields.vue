<script setup lang="ts">
import type { TaxTier } from '@/utils/daily-report-calc';
import HmSplitSelect from '@/components/HmSplitSelect.vue';
import ReportAttachmentPreview from '@/components/ReportAttachmentPreview.vue';

/** 与两页 `reactive({...})` 对齐的可变表单切片（父组件传入同一 reactive） */
export type DailyReportFormFieldsModel = {
  responsiblePersonId: string;
  startStr: string;
  endStr: string;
  chargeNightPackYen: number;
  productSalesYen: number;
  taxFreeCouponCounts: Record<string, number>;
  newageYen: number;
  airpayQrYen: number;
  cashInDrawerYen: number;
  deviationReason: string;
};

defineProps<{
  form: DailyReportFormFieldsModel;
  persons: { id: string; name: string }[];
  activeTiersSorted: TaxTier[];
  registerFloatAmount: number;
  cashNetForReport: number;
  savedDdnPhotoKey: string | null;
  savedTaxFreePhotoKey: string | null;
  ddnFile: File | null;
  taxFile: File | null;
  photoAccept: string;
  couponEmptyHint: string;
  /** wm：时段下展示长说明；admin：不展示 */
  variant: 'wm' | 'admin';
  /** 网管：仅新建时展示业务日说明 */
  showWmTimeHint?: boolean;
  startTimeFromPreviousShift?: boolean;
  /** 管理员新建：填报人（网管） */
  showWebmasterSelect?: boolean;
  webmasters?: { id: string; username: string }[];
}>();

const createdByUserId = defineModel<string>('createdByUserId', { required: false });

defineEmits<{
  pickDdn: [e: Event];
  pickTax: [e: Event];
  confirm: [];
}>();
</script>

<template>
  <div class="daily-report-form-fields">
    <ReportAttachmentPreview
      v-if="savedDdnPhotoKey || savedTaxFreePhotoKey"
      :ddn-photo-key="savedDdnPhotoKey"
      :tax-free-card-photo-key="savedTaxFreePhotoKey"
    />
    <el-form-item v-if="showWebmasterSelect" label="提出元（網管）">
      <el-select v-model="createdByUserId" style="width: 280px">
        <el-option
          v-for="w in webmasters"
          :key="w.id"
          :label="w.username"
          :value="w.id"
        />
      </el-select>
    </el-form-item>
    <el-form-item label="責任者">
      <el-select v-model="form.responsiblePersonId" style="width: 280px">
        <el-option
          v-for="p in persons"
          :key="p.id"
          :label="p.name"
          :value="p.id"
        />
      </el-select>
    </el-form-item>
    <el-form-item label="時間帯（開始–終了）">
      <span class="time-group">
        <span class="time-label">開始</span>
        <HmSplitSelect v-model="form.startStr" />
      </span>
      <span class="sep">—</span>
      <span class="time-group">
        <span class="time-label">終了</span>
        <HmSplitSelect v-model="form.endStr" />
      </span>
      <p v-if="variant === 'wm' && showWmTimeHint" class="field-hint">
        業務日は「白1 → 白2 → 夜番 → 翌早番」の順です（本ページの日付は白1 が始まる日付。夜番が翌朝まで続いても同じ業務日です）。
        前シフトの日報がある場合、開始時刻はその終了時刻が初期値になります（白1 は前業務日の最終シフトの終了が参照されます）。いずれも手で変更できます。
        日をまたぐ勤務では、終了が開始より早い時刻（翌日側）になり得ます（例: 23:00–07:10）。
        <template v-if="startTimeFromPreviousShift">
          （開始時刻は前シフト終了時刻で自動入力されています）
        </template>
      </p>
    </el-form-item>
    <el-form-item label="チャージ・ナイト / 商品売上">
      <el-input-number v-model="form.chargeNightPackYen" :min="0" /> /
      <el-input-number v-model="form.productSalesYen" :min="0" />
    </el-form-item>
    <el-form-item label="10％クーポン（枚数）">
      <div v-if="!activeTiersSorted.length" class="field-hint">
        {{ couponEmptyHint }}
      </div>
      <div v-else class="coupon-row">
        <span
          v-for="t in activeTiersSorted"
          :key="t.id"
          class="coupon-cell"
        >
          <span class="coupon-denom"
            >{{ t.denominationYen.toLocaleString('ja-JP') }} 円</span
          >
          <el-input-number
            v-model="form.taxFreeCouponCounts[t.id]"
            :min="0"
          />
        </span>
      </div>
    </el-form-item>
    <el-form-item label="Newage / Airpay+QR">
      <el-input-number v-model="form.newageYen" :min="0" />
      <el-input-number v-model="form.airpayQrYen" :min="0" />
    </el-form-item>
    <el-form-item label="レジ現金（実点・底銭込）">
      <el-input-number v-model="form.cashInDrawerYen" :min="0" />
      <p class="field-hint">
        レジ内の現金を数えた金額（レジ底銭 {{ registerFloatAmount }} 円を含む）。精算の現金合計は
        {{ cashNetForReport }} 円（実点 − 底銭）です。
      </p>
    </el-form-item>
    <el-form-item label="偏差理由（負偏差時必須）">
      <el-input v-model="form.deviationReason" type="textarea" :rows="2" />
    </el-form-item>
    <el-form-item label="DDN（画像／PDF）※必須">
      <input type="file" :accept="photoAccept" @change="$emit('pickDdn', $event)" />
      <p v-if="ddnFile" class="field-hint">選択中: {{ ddnFile.name }}</p>
    </el-form-item>
    <el-form-item label="10％クーポン（画像／PDF）※任意">
      <input type="file" :accept="photoAccept" @change="$emit('pickTax', $event)" />
      <p v-if="taxFile" class="field-hint">選択中: {{ taxFile.name }}</p>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="$emit('confirm')">確認</el-button>
    </el-form-item>
  </div>
</template>

<style scoped>
.sep {
  margin: 0 12px;
}
.time-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.time-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}
.field-hint {
  margin: 8px 0 0;
  width: 100%;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}
.coupon-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
}
.coupon-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.coupon-denom {
  min-width: 4.5em;
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}
</style>
