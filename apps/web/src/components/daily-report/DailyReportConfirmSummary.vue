<script setup lang="ts">
const props = defineProps<{
  preview: {
    totalSalesYen: number;
    taxFreeCardAmountYen: number;
    deviationYen: number;
    cashNetYen: number;
  };
  shiftName: string;
  personName: string;
  couponCountsConfirmLine: string;
  registerFloatAmount: number;
  startStr: string;
  endStr: string;
  chargeNightPackYen: number;
  productSalesYen: number;
  newageYen: number;
  airpayQrYen: number;
  cashInDrawerYen: number;
  deviationReason: string;
  /** 仅管理员新建时展示 */
  showWebmasterRow?: boolean;
  webmasterLabel?: string;
}>();

function yen(n: number): string {
  return `${n.toLocaleString('ja-JP')} 円`;
}

function couponLine(): string {
  const s = props.couponCountsConfirmLine?.trim();
  return s && s !== '—' ? s : '—';
}
</script>

<template>
  <div class="confirm-summary">
    <header class="intro">
      <p class="eyebrow">提出前の確認</p>
      <h2 class="title">入力内容の確認</h2>
      <p class="lede">問題なければ下部の「提出する」で確定してください。修正する場合は上の「入力に戻る」へ。</p>
    </header>

    <section v-if="showWebmasterRow" class="block">
      <h3 class="block-title">提出元</h3>
      <div class="kv-row">
        <span class="kv-label">網管アカウント</span>
        <span class="kv-value">{{ webmasterLabel ?? '—' }}</span>
      </div>
    </section>

    <section class="block">
      <h3 class="block-title">基本</h3>
      <div class="kv-row">
        <span class="kv-label">シフト</span>
        <span class="kv-value">{{ shiftName }}</span>
      </div>
      <div class="kv-row">
        <span class="kv-label">責任者</span>
        <span class="kv-value">{{ personName }}</span>
      </div>
      <div class="kv-row">
        <span class="kv-label">勤務時間</span>
        <span class="kv-value kv-mono">{{ startStr }} — {{ endStr }}</span>
      </div>
    </section>

    <section class="block">
      <h3 class="block-title">売上・クーポン</h3>
      <div class="kv-grid">
        <div class="kv-pair">
          <span class="kv-sublabel">チャージ・ナイト</span>
          <span class="kv-num">{{ yen(chargeNightPackYen) }}</span>
        </div>
        <div class="kv-pair">
          <span class="kv-sublabel">商品売上</span>
          <span class="kv-num">{{ yen(productSalesYen) }}</span>
        </div>
      </div>
      <div class="kv-row row-total">
        <span class="kv-label">総売上（計算）</span>
        <span class="kv-value kv-strong">{{ yen(preview.totalSalesYen) }}</span>
      </div>
      <div class="kv-row">
        <span class="kv-label">10％クーポン（枚数）</span>
        <span class="kv-value">{{ couponLine() }}</span>
      </div>
      <div class="kv-row">
        <span class="kv-label">10％クーポン額（計算・偏差に加算）</span>
        <span class="kv-value">{{ yen(preview.taxFreeCardAmountYen) }}</span>
      </div>
      <div class="kv-grid kv-grid-tight">
        <div class="kv-pair">
          <span class="kv-sublabel">Newage</span>
          <span class="kv-num">{{ yen(newageYen) }}</span>
        </div>
        <div class="kv-pair">
          <span class="kv-sublabel">Airpay+QR</span>
          <span class="kv-num">{{ yen(airpayQrYen) }}</span>
        </div>
      </div>
    </section>

    <section class="block">
      <h3 class="block-title">現金</h3>
      <div class="kv-row">
        <span class="kv-label">レジ実点（底銭込）</span>
        <span class="kv-value">{{ yen(cashInDrawerYen) }}</span>
      </div>
      <div class="kv-row">
        <span class="kv-label">レジ底銭（設定）</span>
        <span class="kv-value">{{ yen(registerFloatAmount) }}</span>
      </div>
      <div class="kv-row row-total">
        <span class="kv-label">現金合計（実点 − 底銭）</span>
        <span class="kv-value kv-strong">{{ yen(preview.cashNetYen) }}</span>
      </div>
    </section>

    <section class="block block-highlight">
      <h3 class="block-title">偏差（計算）</h3>
      <p class="deviation-num">{{ yen(preview.deviationYen) }}</p>
    </section>

    <section v-if="deviationReason" class="block">
      <h3 class="block-title">メモ</h3>
      <p class="reason-body">{{ deviationReason }}</p>
    </section>
  </div>
</template>

<style scoped>
.confirm-summary {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 8px;
}

.intro {
  padding: 4px 0 8px;
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--fs-muted, var(--el-text-color-secondary));
}

.title {
  margin: 0 0 8px;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--fs-ink, var(--el-text-color-primary));
  line-height: 1.25;
}

.lede {
  margin: 0;
  max-width: 52ch;
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--fs-muted, var(--el-text-color-secondary));
}

.block {
  padding: 18px 20px 16px;
  border: 1px solid var(--fs-border, var(--el-border-color));
  border-radius: var(--fs-radius-md, 10px);
  background: var(--fs-surface-elevated, var(--el-bg-color));
  box-shadow: var(--fs-shadow-soft, none);
}

.block-title {
  margin: 0 0 12px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fs-muted, var(--el-text-color-secondary));
}

.kv-row {
  display: grid;
  grid-template-columns: minmax(120px, 42%) 1fr;
  gap: 8px 16px;
  padding: 10px 0;
  border-bottom: 1px solid var(--fs-border, var(--el-border-color-lighter));
  align-items: baseline;
}

.kv-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.kv-row:first-of-type {
  padding-top: 0;
}

.row-total {
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px dashed var(--fs-border, var(--el-border-color-lighter));
}

.kv-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--fs-muted, var(--el-text-color-secondary));
}

.kv-value {
  font-size: 0.95rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--fs-ink, var(--el-text-color-primary));
  word-break: break-word;
}

.kv-mono {
  font-weight: 600;
  letter-spacing: 0.02em;
}

.kv-strong {
  font-weight: 700;
  font-size: 1.05rem;
}

.kv-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 20px;
  padding: 4px 0 12px;
  border-bottom: 1px solid var(--fs-border, var(--el-border-color-lighter));
}

.kv-grid-tight {
  padding-top: 12px;
  margin-top: 4px;
}

.kv-pair {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kv-sublabel {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--fs-muted, var(--el-text-color-secondary));
}

.kv-num {
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--fs-ink, var(--el-text-color-primary));
}

.block-highlight {
  border-color: var(--fs-border-strong, var(--el-border-color));
  background: var(--fs-surface, var(--el-fill-color-blank));
}

.deviation-num {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: var(--fs-ink, var(--el-text-color-primary));
}

.reason-body {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  white-space: pre-wrap;
  color: var(--fs-ink, var(--el-text-color-primary));
}

@media (max-width: 520px) {
  .kv-grid {
    grid-template-columns: 1fr;
  }

  .kv-row {
    grid-template-columns: 1fr;
  }

  .kv-value {
    text-align: left;
  }
}
</style>
