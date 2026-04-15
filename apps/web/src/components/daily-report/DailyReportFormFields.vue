<script setup lang="ts">
import { ref } from 'vue';
import { QuestionFilled } from '@element-plus/icons-vue';
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

const ddnInputRef = ref<HTMLInputElement | null>(null);
const taxInputRef = ref<HTMLInputElement | null>(null);

const cashTooltip =
  'レジ内の現金を数えた金額（レジ底銭を含む実点）。提出時の現金計上は「実点 − 底銭」で算出されます。';

const wmTimeCollapse = ref<string[]>([]);
</script>

<template>
  <div class="daily-report-form-fields">
    <ReportAttachmentPreview
      v-if="savedDdnPhotoKey || savedTaxFreePhotoKey"
      :ddn-photo-key="savedDdnPhotoKey"
      :tax-free-card-photo-key="savedTaxFreePhotoKey"
    />

    <section v-if="showWebmasterSelect" class="block">
      <h3 class="block-title">提出元</h3>
      <el-form-item label="網管アカウント" class="item-plain">
        <el-select v-model="createdByUserId" class="field-wide" placeholder="選択">
          <el-option
            v-for="w in webmasters"
            :key="w.id"
            :label="w.username"
            :value="w.id"
          />
        </el-select>
      </el-form-item>
    </section>

    <section class="block">
      <h3 class="block-title">基本</h3>
      <el-form-item label="責任者" class="item-plain">
        <el-select v-model="form.responsiblePersonId" class="field-wide" placeholder="選択">
          <el-option v-for="p in persons" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </el-form-item>

      <el-form-item label="勤務時間" class="item-plain item-time">
        <div class="time-row">
          <div class="time-block">
            <span class="time-tag">開始</span>
            <HmSplitSelect v-model="form.startStr" />
          </div>
          <span class="time-dash" aria-hidden="true">—</span>
          <div class="time-block">
            <span class="time-tag">終了</span>
            <HmSplitSelect v-model="form.endStr" />
          </div>
        </div>
        <template v-if="variant === 'wm' && showWmTimeHint">
          <p class="time-lead">
            開始は前シフト終了時刻が入ることがあります。日をまたぐ場合は終了が開始より早い時刻になり得ます。
            <template v-if="startTimeFromPreviousShift">（現在は前シフト終了を反映済み）</template>
          </p>
          <el-collapse v-model="wmTimeCollapse" class="time-collapse">
            <el-collapse-item title="業務日・時刻の詳しい説明" name="detail">
              <p class="collapse-text">
                業務日は「白1 → 白2 → 夜番 → 翌早番」の順です（本ページの日付は白1
                が始まる日付。夜番が翌朝まで続いても同じ業務日です）。前シフトの日報がある場合、開始時刻はその終了時刻が初期値になります（白1
                は前業務日の最終シフトの終了が参照されます）。いずれも手で変更できます。
              </p>
            </el-collapse-item>
          </el-collapse>
        </template>
      </el-form-item>
    </section>

    <section class="block">
      <h3 class="block-title">売上・決済</h3>
      <el-form-item label="チャージ・ナイト / 商品売上" class="item-plain">
        <div class="money-pair">
          <div class="money-cell">
            <span class="sub-label">チャージ・ナイト</span>
            <el-input-number v-model="form.chargeNightPackYen" :min="0" controls-position="right" />
          </div>
          <div class="money-cell">
            <span class="sub-label">商品売上</span>
            <el-input-number v-model="form.productSalesYen" :min="0" controls-position="right" />
          </div>
        </div>
      </el-form-item>

      <el-form-item label="10％クーポン（枚数）" class="item-plain">
        <div v-if="!activeTiersSorted.length" class="empty-line">
          {{ couponEmptyHint }}
        </div>
        <div v-else class="coupon-grid">
          <div v-for="t in activeTiersSorted" :key="t.id" class="coupon-item">
            <span class="coupon-label">{{ t.denominationYen.toLocaleString('ja-JP') }} 円</span>
            <el-input-number
              v-model="form.taxFreeCouponCounts[t.id]"
              :min="0"
              controls-position="right"
            />
          </div>
        </div>
      </el-form-item>

      <el-form-item label="Newage / Airpay+QR" class="item-plain">
        <div class="money-pair">
          <div class="money-cell">
            <span class="sub-label">Newage</span>
            <el-input-number v-model="form.newageYen" :min="0" controls-position="right" />
          </div>
          <div class="money-cell">
            <span class="sub-label">Airpay+QR</span>
            <el-input-number v-model="form.airpayQrYen" :min="0" controls-position="right" />
          </div>
        </div>
      </el-form-item>

      <el-form-item class="item-plain">
        <template #label>
          <span class="label-with-tip">
            レジ現金（実点・底銭込）
            <el-tooltip :content="cashTooltip" placement="top" :show-after="300">
              <span class="tip-wrap" tabindex="0" role="button" aria-label="レジ現金の説明">
                <el-icon :size="16"><QuestionFilled /></el-icon>
              </span>
            </el-tooltip>
          </span>
        </template>
        <el-input-number v-model="form.cashInDrawerYen" :min="0" controls-position="right" />
        <p class="cash-meta">
          精算計上 <strong>{{ cashNetForReport.toLocaleString('ja-JP') }}</strong> 円（底銭
          {{ registerFloatAmount.toLocaleString('ja-JP') }} 円を除く）
        </p>
      </el-form-item>
    </section>

    <section class="block">
      <h3 class="block-title">メモ</h3>
      <el-form-item label="偏差理由（負偏差時は必須）" class="item-plain">
        <el-input v-model="form.deviationReason" type="textarea" :rows="3" />
      </el-form-item>
    </section>

    <section class="block">
      <h3 class="block-title">添付</h3>
      <el-form-item label="DDN（画像／PDF）" required class="item-plain">
        <div class="file-row">
          <input
            ref="ddnInputRef"
            type="file"
            class="visually-hidden"
            :accept="photoAccept"
            @change="$emit('pickDdn', $event)"
          />
          <el-button @click="ddnInputRef?.click()">ファイルを選択</el-button>
          <span class="file-name" :class="{ 'is-empty': !ddnFile }">{{ ddnFile?.name ?? '未選択（必須）' }}</span>
        </div>
      </el-form-item>
      <el-form-item label="10％クーポン（画像／PDF）" class="item-plain">
        <div class="file-row">
          <input
            ref="taxInputRef"
            type="file"
            class="visually-hidden"
            :accept="photoAccept"
            @change="$emit('pickTax', $event)"
          />
          <el-button @click="taxInputRef?.click()">ファイルを選択</el-button>
          <span class="file-name" :class="{ 'is-empty': !taxFile }">{{ taxFile?.name ?? '任意' }}</span>
        </div>
      </el-form-item>
    </section>

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

.block {
  padding: 18px 20px 20px;
  border: 1px solid var(--fs-border, var(--el-border-color));
  border-radius: var(--fs-radius-md, 10px);
  background: var(--fs-surface-elevated, var(--el-bg-color));
  box-shadow: var(--fs-shadow-soft, none);
}

@media (prefers-reduced-motion: no-preference) {
  .block {
    transition:
      border-color 0.22s var(--fs-ease-out, cubic-bezier(0.25, 1, 0.5, 1)),
      box-shadow 0.26s var(--fs-ease-out, cubic-bezier(0.25, 1, 0.5, 1));
  }
}

/* 触屏では hover を当てにしない（impeccable responsive-design） */
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .block:hover {
    border-color: var(--fs-border-strong, var(--el-border-color));
    box-shadow:
      0 1px 2px rgba(28, 26, 22, 0.06),
      0 12px 32px rgba(28, 26, 22, 0.07);
  }
}

.block-title {
  margin: 0 0 14px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fs-muted, var(--el-text-color-secondary));
}

.item-plain {
  margin-bottom: 16px;
}

.item-plain:last-child {
  margin-bottom: 0;
}

.item-plain :deep(.el-form-item__label) {
  font-weight: 600;
  color: var(--fs-ink, var(--el-text-color-primary));
}

.field-wide {
  width: 100%;
  max-width: 360px;
}

.time-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px 12px;
}

.time-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.time-tag {
  font-size: 12px;
  font-weight: 600;
  color: var(--fs-muted, var(--el-text-color-secondary));
}

.time-dash {
  padding-bottom: 8px;
  font-weight: 700;
  color: var(--fs-faint, var(--el-text-color-placeholder));
}

.time-lead {
  margin: 12px 0 0;
  max-width: 62ch;
  font-size: 13px;
  line-height: 1.5;
  color: var(--fs-muted, var(--el-text-color-secondary));
}

.time-collapse {
  margin-top: 8px;
  border: none;
  --el-collapse-header-height: 40px;
}

.time-collapse :deep(.el-collapse-item__header) {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-primary);
  border: none;
}

.time-collapse :deep(.el-collapse-item__wrap) {
  border: none;
}

.time-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 4px;
}

.collapse-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--fs-muted, var(--el-text-color-secondary));
  max-width: 70ch;
}

.money-pair {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px 20px;
  width: 100%;
  max-width: 480px;
}

.money-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sub-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--fs-muted, var(--el-text-color-secondary));
}

.coupon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 20px;
}

.coupon-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 140px;
}

.coupon-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--fs-muted, var(--el-text-color-secondary));
}

.empty-line {
  font-size: 13px;
  color: var(--fs-muted, var(--el-text-color-secondary));
  line-height: 1.45;
  max-width: 52ch;
}

.label-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tip-wrap {
  display: inline-flex;
  cursor: help;
  color: var(--fs-muted, var(--el-text-color-secondary));
}

.cash-meta {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--fs-muted, var(--el-text-color-secondary));
}

.file-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.file-name {
  font-size: 13px;
  color: var(--fs-ink, var(--el-text-color-primary));
  word-break: break-all;
}

.file-name.is-empty {
  color: var(--fs-faint, var(--el-text-color-placeholder));
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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

.item-plain :deep(.el-input-number) {
  width: 100%;
  max-width: 200px;
}
</style>
