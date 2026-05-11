<script setup lang="ts">
import { QuestionFilled } from '@element-plus/icons-vue';
import type { TaxTier } from '@/utils/daily-report-calc';
import DailyReportSection from './DailyReportSection.vue';
import type { DailyReportFormFieldsModel } from './daily-report-form.types';

defineProps<{
  form: DailyReportFormFieldsModel;
  activeTiersSorted: TaxTier[];
  registerFloatAmount: number;
  cashNetForReport: number;
  couponEmptyHint: string;
}>();

const cashTooltip =
  'レジ内の現金を数えた金額（レジ底銭を含む実点）。提出時の現金計上は「実点 − 底銭」で算出されます。';
</script>

<template>
  <DailyReportSection title="売上・決済">
    <el-form-item label="チャージ・ナイト / 商品売上" class="item-plain">
      <div class="money-pair">
        <div class="money-cell">
          <span class="sub-label">チャージ・ナイト（税抜）</span>
          <el-input-number v-model="form.chargeNightPackYen" :min="0" controls-position="right" />
        </div>
        <div class="money-cell">
          <span class="sub-label">商品売上（税込）</span>
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
  </DailyReportSection>
</template>

<style scoped>
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

.item-plain :deep(.el-input-number) {
  width: 100%;
  max-width: 200px;
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

.sub-label,
.coupon-label {
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
</style>
