<script setup lang="ts">
defineProps<{
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
</script>

<template>
  <el-descriptions title="入力内容の確認" border :column="1" class="summary">
    <el-descriptions-item v-if="showWebmasterRow" label="提出元（網管）">
      {{ webmasterLabel }}
    </el-descriptions-item>
    <el-descriptions-item label="シフト">{{ shiftName }}</el-descriptions-item>
    <el-descriptions-item label="責任者">{{ personName }}</el-descriptions-item>
    <el-descriptions-item label="時間帯">
      {{ startStr }} — {{ endStr }}
    </el-descriptions-item>
    <el-descriptions-item label="チャージ・ナイト">
      {{ chargeNightPackYen }} 円
    </el-descriptions-item>
    <el-descriptions-item label="商品売上">
      {{ productSalesYen }} 円
    </el-descriptions-item>
    <el-descriptions-item label="総売上（計算）">
      {{ preview.totalSalesYen }} 円
    </el-descriptions-item>
    <el-descriptions-item label="10％クーポン（枚数）">
      {{ couponCountsConfirmLine }}
    </el-descriptions-item>
    <el-descriptions-item label="10％クーポン額（計算・偏差に加算）">
      {{ preview.taxFreeCardAmountYen }} 円
    </el-descriptions-item>
    <el-descriptions-item label="Newage">{{ newageYen }} 円</el-descriptions-item>
    <el-descriptions-item label="Airpay+QR">{{ airpayQrYen }} 円</el-descriptions-item>
    <el-descriptions-item label="レジ実点（底銭込）">
      {{ cashInDrawerYen }} 円
    </el-descriptions-item>
    <el-descriptions-item label="レジ底銭（設定）">
      {{ registerFloatAmount }} 円
    </el-descriptions-item>
    <el-descriptions-item label="現金合計（実点 − 底銭）">
      {{ preview.cashNetYen }} 円
    </el-descriptions-item>
    <el-descriptions-item label="偏差（計算）">
      <span class="deviation">{{ preview.deviationYen }} 円</span>
    </el-descriptions-item>
    <el-descriptions-item v-if="deviationReason" label="偏差理由">
      {{ deviationReason }}
    </el-descriptions-item>
  </el-descriptions>
</template>

<style scoped>
.summary {
  margin-bottom: 24px;
}
.deviation {
  font-size: 1.15rem;
  font-weight: 600;
}
</style>
