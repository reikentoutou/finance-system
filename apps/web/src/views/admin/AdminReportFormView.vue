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
  chargeNightPackExcludedFromIncluded,
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
const step = ref<'form' | 'confirm'>('form');
const taxTiers = ref<TaxTier[]>([]);
const serverCouponBaseline = ref<Record<string, number>>({});
const registerFloatAmount = ref(0);
const editId = ref<string | null>(null);
const shiftId = ref('');
const reportDate = ref('');
const createdByUserId = ref('');
const shifts = ref<{ id: string; name: string }[]>([]);
const persons = ref<{ id: string; name: string }[]>([]);
const webmasters = ref<{ id: string; username: string }[]>([]);

const {
  ddnFile,
  taxFile,
  savedDdnPhotoKey,
  savedTaxFreePhotoKey,
  onPickDdn,
  onPickTax,
  clearPickedFiles,
} = useReportAttachmentFiles();

const form = reactive({
  responsiblePersonId: '',
  startStr: '09:00',
  endStr: '18:00',
  chargeNightPackYen: 0,
  productSalesYen: 0,
  taxFreeCouponCounts: {} as Record<string, number>,
  newageYen: 0,
  airpayQrYen: 0,
  cashInDrawerYen: 0,
  deviationReason: '',
});

const isNew = computed(() => !editId.value);

const shiftName = computed(
  () => shifts.value.find((s) => s.id === shiftId.value)?.name ?? '—',
);
const personName = computed(
  () =>
    persons.value.find((p) => p.id === form.responsiblePersonId)?.name ?? '—',
);
const webmasterLabel = computed(
  () =>
    webmasters.value.find((w) => w.id === createdByUserId.value)?.username ??
    '—',
);

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
  registerFloatAmount,
  couponCountsForPreview,
);

const couponCountsConfirmLine = computed(() =>
  formatCouponCountsLine(taxTiers.value, couponCountsForPreview.value),
);

function syncCouponKeys() {
  syncCouponFormKeys(form.taxFreeCouponCounts, taxTiers.value);
}

async function loadMeta() {
  const [{ data: s }, { data: p }, { data: w }, { data: settings }, { data: tiers }] =
    await Promise.all([
      http.get('/meta/shifts'),
      http.get('/meta/responsible-persons'),
      http.get('/meta/webmaster-users'),
      http.get<{ registerFloatAmount?: number } | null>('/meta/settings'),
      http.get<TaxTier[]>('/meta/tax-tiers'),
    ]);
  shifts.value = s;
  persons.value = p;
  webmasters.value = w;
  registerFloatAmount.value = settings?.registerFloatAmount ?? 0;
  taxTiers.value = tiers ?? [];
  syncCouponKeys();
  if (!form.responsiblePersonId && p[0]) form.responsiblePersonId = p[0].id;
}

async function loadExisting(id: string) {
  const { data } = await http.get(`/daily-reports/${id}`);
  editId.value = id;
  shiftId.value = data.shiftId;
  reportDate.value = data.reportDate;
  createdByUserId.value = data.createdByUserId;
  form.responsiblePersonId = data.responsiblePersonId;
  const sm = data.startMinuteOfDay;
  const em = data.endMinuteOfDay;
  form.startStr = `${String(Math.floor(sm / 60)).padStart(2, '0')}:${String(sm % 60).padStart(2, '0')}`;
  form.endStr = `${String(Math.floor(em / 60)).padStart(2, '0')}:${String(em % 60).padStart(2, '0')}`;
  form.chargeNightPackYen = chargeNightPackExcludedFromIncluded(
    data.chargeNightPackYen,
  );
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
  form.cashInDrawerYen = data.cashTotalYen;
  form.deviationReason = data.deviationReason || '';
  savedDdnPhotoKey.value = data.ddnPhotoKey ?? null;
  savedTaxFreePhotoKey.value = data.taxFreeCardPhotoKey ?? null;
}

async function loadNewDefaultsFromPreviousShift() {
  if (!reportDate.value || !shiftId.value) return;
  try {
    const { data } = await http.get<{ previousShiftEndMinute: number | null }>(
      '/daily-reports/hint/business-day',
      { params: { reportDate: reportDate.value, shiftId: shiftId.value } },
    );
    if (data.previousShiftEndMinute == null) return;
    form.startStr = minuteToHm(data.previousShiftEndMinute);
    const sm = parseHmToMinute(form.startStr);
    const em = parseHmToMinute(form.endStr);
    form.endStr = minuteToHm(wrapEndAfterStart(sm, em));
  } catch {
    // 仅作时间提示；失败不改变当前表单
  }
}

function resetFormForNewAdminReport() {
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

async function loadPage() {
  loading.value = true;
  step.value = 'form';
  clearPickedFiles();
  try {
    await loadMeta();
    if (route.name === 'admin-report-edit' && route.params.id) {
      await loadExisting(route.params.id as string);
    } else if (route.name === 'admin-report-new') {
      editId.value = null;
      reportDate.value = (route.query.reportDate as string) || '';
      shiftId.value = (route.query.shiftId as string) || '';
      createdByUserId.value = (route.query.createdByUserId as string) || '';
      resetFormForNewAdminReport();
      await loadNewDefaultsFromPreviousShift();
    }
  } catch (e: unknown) {
    ElMessage.error(httpErrorMessage(e, '読み込みに失敗しました'));
  } finally {
    loading.value = false;
  }
}

watch(
  () =>
    [
      route.name,
      route.params.id,
      route.query.reportDate,
      route.query.shiftId,
      route.query.createdByUserId,
    ] as const,
  () => {
    if (route.name === 'admin-report-edit' || route.name === 'admin-report-new') {
      void loadPage();
    }
  },
  { immediate: true },
);

function goToConfirm() {
  const err = validateDailyReportGoToConfirm({
    form,
    ddnFile: ddnFile.value,
    savedDdnPhotoKey: savedDdnPhotoKey.value,
    admin: isNew.value
      ? {
          isNew: true,
          createdByUserId: createdByUserId.value,
          reportDate: reportDate.value,
          shiftId: shiftId.value,
        }
      : undefined,
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
  const base = {
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
    cashTotalYen: form.cashInDrawerYen,
    deviationReason: form.deviationReason || undefined,
  };
  if (isNew.value) {
    return { ...base, createdByUserId: createdByUserId.value };
  }
  return base;
}

async function submit() {
  const errSubmit = validateDailyReportSubmit({
    form,
    ddnFile: ddnFile.value,
    savedDdnPhotoKey: savedDdnPhotoKey.value,
    previewDeviationYen: preview.value.deviationYen,
    admin: isNew.value
      ? {
          isNew: true,
          createdByUserId: createdByUserId.value,
          reportDate: reportDate.value,
          shiftId: shiftId.value,
        }
      : undefined,
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
    router.replace('/admin/daily');
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
      <h2>日報（管理者）— {{ reportDate }}</h2>
    </header>

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
        :product-sales-yen="form.productSalesYen"
        :newage-yen="form.newageYen"
        :airpay-qr-yen="form.airpayQrYen"
        :cash-in-drawer-yen="form.cashInDrawerYen"
        :deviation-reason="form.deviationReason"
        :show-webmaster-row="isNew"
        :webmaster-label="webmasterLabel"
      />
      <div class="confirm-actions">
        <el-button type="primary" size="large" class="submit-btn" :loading="saving" @click="submit">
          提出する
        </el-button>
      </div>
    </template>

    <el-form
      v-if="!loading && step === 'form'"
      label-position="top"
      require-asterisk-position="right"
      class="form"
    >
      <DailyReportFormFields
        v-model:created-by-user-id="createdByUserId"
        :form="form"
        :persons="persons"
        :active-tiers-sorted="activeTiersSorted"
        :register-float-amount="registerFloatAmount"
        :cash-net-for-report="cashNetForReport"
        :deviation-yen-preview="preview.deviationYen"
        :saved-ddn-photo-key="savedDdnPhotoKey"
        :saved-tax-free-photo-key="savedTaxFreePhotoKey"
        :ddn-file="ddnFile"
        :tax-file="taxFile"
        :photo-accept="REPORT_PHOTO_ACCEPT"
        coupon-empty-hint="有効な券種がありません。マスタ・設定で券種を追加してください。"
        variant="admin"
        :show-webmaster-select="isNew"
        :webmasters="webmasters"
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
}
.bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.confirm-actions {
  margin-top: 20px;
  padding-top: 8px;
}

.submit-btn {
  width: 100%;
  max-width: 360px;
  font-weight: 700;
}
</style>
