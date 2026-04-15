<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { http } from '@/api/http';
import { ElMessage } from 'element-plus';
import { confirmCashBeforeSubmit } from '@/utils/coupon-labels';
import { minuteToHm, parseHmToMinute, wrapEndAfterStart } from '@/utils/time-parse';
import {
  validateDailyReportGoToConfirm,
  validateDailyReportSubmit,
} from '@/utils/daily-report-form-validate';
import {
  type TaxTier,
  tiersSortedActive,
  formatCouponCountsLine,
} from '@/utils/daily-report-calc';
import { useDailyReportPreview } from '@/composables/useDailyReportPreview';
import ReportAttachmentPreview from '@/components/ReportAttachmentPreview.vue';
import DailyReportFormFields from '@/components/daily-report/DailyReportFormFields.vue';
import DailyReportConfirmSummary from '@/components/daily-report/DailyReportConfirmSummary.vue';
import {
  useReportAttachmentFiles,
  REPORT_PHOTO_ACCEPT,
} from '@/composables/useReportAttachmentFiles';
import {
  syncCouponFormKeys,
  parseServerCouponBaseline,
  applyTaxFreeCountsFromRawToForm,
} from '@/utils/daily-report-form-sync';
import { httpErrorMessage } from '@/utils/http-error-message';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
/** 填写 → 确认 */
const step = ref<'form' | 'confirm'>('form');
const taxTiers = ref<TaxTier[]>([]);
/** 编辑时：表单不展示的失效券种等 key 的枚数（预览与保存合并用） */
const serverCouponBaseline = ref<Record<string, number>>({});
/** 设置中的收银底钱（从实点中扣除） */
const registerFloatAmount = ref(0);
const editId = ref<string | null>(null);
const shiftId = ref('');
const reportDate = ref('');
const shifts = ref<{ id: string; name: string }[]>([]);
const persons = ref<{ id: string; name: string }[]>([]);

const {
  ddnFile,
  taxFile,
  savedDdnPhotoKey,
  savedTaxFreePhotoKey,
  onPickDdn,
  onPickTax,
  clearPickedFiles,
} = useReportAttachmentFiles();
/** 新建时：开始时刻是否已按上一班次结束对齐（仅展示；可手改） */
const startTimeFromPreviousShift = ref(false);

const form = reactive({
  responsiblePersonId: '',
  startStr: '09:00',
  endStr: '18:00',
  chargeNightPackYen: 0,
  productSalesYen: 0,
  /** 仅有效券种 id（提交 payload 用） */
  taxFreeCouponCounts: {} as Record<string, number>,
  newageYen: 0,
  airpayQrYen: 0,
  /** 收银机内实点现金（含底钱） */
  cashInDrawerYen: 0,
  deviationReason: '',
});

const pageTitle = computed(() =>
  editId.value ? '日報を編集' : '日報を新規',
);

const shiftName = computed(
  () => shifts.value.find((s) => s.id === shiftId.value)?.name ?? '—',
);
const personName = computed(
  () =>
    persons.value.find((p) => p.id === form.responsiblePersonId)?.name ?? '—',
);

/** 结算/保存用：输入实点 − 底钱（小于 0 时按 0） */
const cashNetForReport = computed(() =>
  Math.max(0, form.cashInDrawerYen - registerFloatAmount.value),
);

const activeTiersSorted = computed(() => tiersSortedActive(taxTiers.value));

const couponCountsForPreview = computed(() => {
  const m = { ...serverCouponBaseline.value };
  for (const t of activeTiersSorted.value) {
    m[t.id] = form.taxFreeCouponCounts[t.id] ?? 0;
  }
  return m;
});

const preview = useDailyReportPreview(
  form,
  taxTiers,
  cashNetForReport,
  couponCountsForPreview,
);

const couponCountsConfirmLine = computed(() =>
  formatCouponCountsLine(taxTiers.value, couponCountsForPreview.value),
);

function syncCouponKeys() {
  syncCouponFormKeys(form.taxFreeCouponCounts, taxTiers.value);
}

async function loadMeta() {
  const [{ data: s }, { data: p }, { data: settings }, { data: tiers }] =
    await Promise.all([
      http.get('/meta/shifts'),
      http.get('/meta/responsible-persons'),
      http.get<{ registerFloatAmount?: number } | null>('/meta/settings'),
      http.get<TaxTier[]>('/meta/tax-tiers'),
    ]);
  shifts.value = s;
  persons.value = p;
  registerFloatAmount.value = settings?.registerFloatAmount ?? 0;
  taxTiers.value = tiers ?? [];
  syncCouponKeys();
  if (!form.responsiblePersonId && p[0]) form.responsiblePersonId = p[0].id;
}

async function loadExisting(id: string) {
  const { data } = await http.get(`/daily-reports/${id}`);
  startTimeFromPreviousShift.value = false;
  editId.value = id;
  shiftId.value = data.shiftId;
  reportDate.value = data.reportDate;
  form.responsiblePersonId = data.responsiblePersonId;
  const sm = data.startMinuteOfDay;
  const em = data.endMinuteOfDay;
  form.startStr = `${String(Math.floor(sm / 60)).padStart(2, '0')}:${String(sm % 60).padStart(2, '0')}`;
  form.endStr = `${String(Math.floor(em / 60)).padStart(2, '0')}:${String(em % 60).padStart(2, '0')}`;
  form.chargeNightPackYen = data.chargeNightPackYen;
  form.productSalesYen = data.productSalesYen;
  const raw = (data.taxFreeCouponCounts ?? {}) as Record<string, unknown>;
  serverCouponBaseline.value = parseServerCouponBaseline(raw);
  syncCouponKeys();
  applyTaxFreeCountsFromRawToForm(
    form.taxFreeCouponCounts,
    raw,
    activeTiersSorted.value,
  );
  form.newageYen = data.newageYen;
  form.airpayQrYen = data.airpayQrYen;
  form.cashInDrawerYen = data.cashTotalYen + registerFloatAmount.value;
  form.deviationReason = data.deviationReason || '';
  savedDdnPhotoKey.value = data.ddnPhotoKey ?? null;
  savedTaxFreePhotoKey.value = data.taxFreeCardPhotoKey ?? null;
}

/** 新建：同一业务日 sortOrder 上一档已有日报则开始时刻默认为其结束（与责任人无关），可手改 */
async function applyStartFromPreviousShift() {
  startTimeFromPreviousShift.value = false;
  try {
    const { data } = await http.get<{ previousShiftEndMinute: number | null }>(
      '/daily-reports/hint/business-day',
      { params: { reportDate: reportDate.value, shiftId: shiftId.value } },
    );
    if (data.previousShiftEndMinute == null) return;
    form.startStr = minuteToHm(data.previousShiftEndMinute);
    startTimeFromPreviousShift.value = true;
    const sm = parseHmToMinute(form.startStr);
    const em = parseHmToMinute(form.endStr);
    form.endStr = minuteToHm(wrapEndAfterStart(sm, em));
  } catch {
    // API 不可用时保留 reset 后的默认时间，仍可手填
  }
}

function resetFormForNewShift() {
  editId.value = null;
  form.startStr = '09:00';
  form.endStr = '18:00';
  form.chargeNightPackYen = 0;
  form.productSalesYen = 0;
  serverCouponBaseline.value = {};
  syncCouponKeys();
  for (const t of activeTiersSorted.value) {
    form.taxFreeCouponCounts[t.id] = 0;
  }
  form.newageYen = 0;
  form.airpayQrYen = 0;
  form.cashInDrawerYen = 0;
  form.deviationReason = '';
  if (persons.value[0]) form.responsiblePersonId = persons.value[0].id;
  savedDdnPhotoKey.value = null;
  savedTaxFreePhotoKey.value = null;
}

async function tryLoadExistingForNew() {
  const { data: list } = await http.get<{ shiftId: string; id: string }[]>(
    '/daily-reports',
    { params: { reportDate: reportDate.value } },
  );
  const ex = list.find((x) => x.shiftId === shiftId.value);
  if (ex) {
    await loadExisting(ex.id);
    return;
  }
  resetFormForNewShift();
  await applyStartFromPreviousShift();
}

async function loadPage() {
  loading.value = true;
  step.value = 'form';
  clearPickedFiles();
  try {
    await loadMeta();
    if (route.name === 'wm-report-edit') {
      await loadExisting(route.params.id as string);
    } else if (route.name === 'wm-report') {
      reportDate.value = String(route.params.date ?? '');
      shiftId.value = String(route.params.shiftId ?? '');
      await tryLoadExistingForNew();
    }
  } catch (e: unknown) {
    ElMessage.error(httpErrorMessage(e, '読み込みに失敗しました'));
  } finally {
    loading.value = false;
  }
}

watch(
  () =>
    [route.name, route.params.date, route.params.shiftId, route.params.id] as const,
  () => {
    if (route.name === 'wm-report' || route.name === 'wm-report-edit') {
      void loadPage();
    }
  },
  { immediate: true },
);

function goToConfirm() {
  const err = validateDailyReportGoToConfirm({
    form,
    registerFloatAmount: registerFloatAmount.value,
    ddnFile: ddnFile.value,
    savedDdnPhotoKey: savedDdnPhotoKey.value,
  });
  if (err) {
    ElMessage.error(err);
    return;
  }
  step.value = 'confirm';
}

function backToForm() {
  step.value = 'form';
}

function buildPayload() {
  const startMinuteOfDay = parseHmToMinute(form.startStr);
  const endMinuteOfDay = parseHmToMinute(form.endStr);
  return {
    reportDate: reportDate.value,
    shiftId: shiftId.value,
    responsiblePersonId: form.responsiblePersonId,
    startMinuteOfDay,
    endMinuteOfDay,
    chargeNightPackYen: form.chargeNightPackYen,
    productSalesYen: form.productSalesYen,
    taxFreeCouponCounts: Object.fromEntries(
      activeTiersSorted.value.map((t) => [
        t.id,
        form.taxFreeCouponCounts[t.id] ?? 0,
      ]),
    ),
    newageYen: form.newageYen,
    airpayQrYen: form.airpayQrYen,
    cashTotalYen: cashNetForReport.value,
    deviationReason: form.deviationReason || undefined,
  };
}

async function submit() {
  const errSubmit = validateDailyReportSubmit({
    form,
    registerFloatAmount: registerFloatAmount.value,
    ddnFile: ddnFile.value,
    savedDdnPhotoKey: savedDdnPhotoKey.value,
    previewDeviationYen: preview.value.deviationYen,
  });
  if (errSubmit) {
    ElMessage.error(errSubmit);
    return;
  }
  try {
    await confirmCashBeforeSubmit({
      registerFloatYen: registerFloatAmount.value,
      cashInDrawerYen: form.cashInDrawerYen,
      withdrawalYen: cashNetForReport.value,
    });
  } catch {
    return;
  }
  saving.value = true;
  try {
    const payload = buildPayload();
    let id = editId.value;
    if (id) {
      await http.put(`/daily-reports/${id}`, payload);
    } else {
      const res = await http.post<{ id: string }>('/daily-reports', payload);
      id = res.data.id;
      editId.value = id;
    }
    if (ddnFile.value || taxFile.value) {
      const fd = new FormData();
      if (ddnFile.value) fd.append('ddn', ddnFile.value);
      if (taxFile.value) fd.append('taxFree', taxFile.value);
      const { data: afterPhotos } = await http.post<{
        ddnPhotoKey?: string | null;
        taxFreeCardPhotoKey?: string | null;
      }>(`/daily-reports/${id}/photos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      savedDdnPhotoKey.value = afterPhotos.ddnPhotoKey ?? savedDdnPhotoKey.value;
      savedTaxFreePhotoKey.value =
        afterPhotos.taxFreeCardPhotoKey ?? savedTaxFreePhotoKey.value;
    }
    ElMessage.success('提出しました');
    router.replace('/wm');
  } catch (e: unknown) {
    ElMessage.error(httpErrorMessage(e, 'エラー'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="page" v-loading="loading">
    <header class="bar">
      <el-button
        link
        @click="step === 'confirm' ? backToForm() : router.back()"
      >
        {{ step === 'confirm' ? '入力に戻る' : '戻る' }}
      </el-button>
      <h2>{{ pageTitle }} — {{ reportDate }}</h2>
    </header>

    <!-- 确认：展示填写内容与计算偏差 -->
    <template v-if="!loading && step === 'confirm'">
      <ReportAttachmentPreview
        v-if="savedDdnPhotoKey || savedTaxFreePhotoKey"
        :ddn-photo-key="savedDdnPhotoKey"
        :tax-free-card-photo-key="savedTaxFreePhotoKey"
      />
      <DailyReportConfirmSummary
        :preview="preview"
        :shift-name="shiftName"
        :person-name="personName"
        :coupon-counts-confirm-line="couponCountsConfirmLine"
        :register-float-amount="registerFloatAmount"
        :start-str="form.startStr"
        :end-str="form.endStr"
        :charge-night-pack-yen="form.chargeNightPackYen"
        :product-sales-yen="form.productSalesYen"
        :newage-yen="form.newageYen"
        :airpay-qr-yen="form.airpayQrYen"
        :cash-in-drawer-yen="form.cashInDrawerYen"
        :deviation-reason="form.deviationReason"
      />
      <div class="confirm-actions">
        <el-button @click="backToForm">入力に戻る</el-button>
        <el-button type="primary" :loading="saving" @click="submit">提出する</el-button>
      </div>
    </template>

    <el-form
      v-if="!loading && step === 'form'"
      label-position="top"
      require-asterisk-position="right"
      class="form"
    >
      <DailyReportFormFields
        :form="form"
        :persons="persons"
        :active-tiers-sorted="activeTiersSorted"
        :register-float-amount="registerFloatAmount"
        :cash-net-for-report="cashNetForReport"
        :saved-ddn-photo-key="savedDdnPhotoKey"
        :saved-tax-free-photo-key="savedTaxFreePhotoKey"
        :ddn-file="ddnFile"
        :tax-file="taxFile"
        :photo-accept="REPORT_PHOTO_ACCEPT"
        coupon-empty-hint="有効な券種がありません。管理者のマスタ・設定で券種を追加してください。"
        variant="wm"
        :show-wm-time-hint="!editId"
        :start-time-from-previous-shift="startTimeFromPreviousShift"
        @pick-ddn="onPickDdn"
        @pick-tax="onPickTax"
        @confirm="goToConfirm"
      />
    </el-form>
  </div>
</template>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
}
.bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
</style>
