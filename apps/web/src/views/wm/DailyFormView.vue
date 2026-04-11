<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { http } from '@/api/http';
import { ElMessage } from 'element-plus';
import { minuteToHm, parseHmToMinute, wrapEndAfterStart } from '@/utils/time-parse';
import type { TaxTier } from '@/utils/daily-report-calc';
import { useDailyReportPreview } from '@/composables/useDailyReportPreview';
import HmSplitSelect from '@/components/HmSplitSelect.vue';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
/** 入力 → 確認 */
const step = ref<'form' | 'confirm'>('form');
const taxTiers = ref<TaxTier[]>([]);
/** 設定のレジ底銭（実点から控除） */
const registerFloatAmount = ref(0);
const editId = ref<string | null>(null);
const shiftId = ref('');
const reportDate = ref('');
const shifts = ref<{ id: string; name: string }[]>([]);
const persons = ref<{ id: string; name: string }[]>([]);

const ddnFile = ref<File | null>(null);
const taxFile = ref<File | null>(null);
/** 新建时是否已把開始時刻设为上一班次終了（用于提示，仍可手改） */
const startTimeFromPreviousShift = ref(false);

const form = reactive({
  responsiblePersonId: '',
  startStr: '09:00',
  endStr: '18:00',
  chargeNightPackYen: 0,
  productSalesYen: 0,
  taxFreeTier1Count: 0,
  taxFreeTier2Count: 0,
  taxFreeTier3Count: 0,
  newageYen: 0,
  airpayQrYen: 0,
  /** レジ内実点の現金（底銭を含む） */
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

/** 精算・保存用：入力実点 − 底銭（0 未満は 0 に丸め） */
const cashNetForReport = computed(() =>
  Math.max(0, form.cashInDrawerYen - registerFloatAmount.value),
);

const preview = useDailyReportPreview(form, taxTiers, cashNetForReport);

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
  form.taxFreeTier1Count = data.taxFreeTier1Count;
  form.taxFreeTier2Count = data.taxFreeTier2Count;
  form.taxFreeTier3Count = data.taxFreeTier3Count;
  form.newageYen = data.newageYen;
  form.airpayQrYen = data.airpayQrYen;
  form.cashInDrawerYen = data.cashTotalYen + registerFloatAmount.value;
  form.deviationReason = data.deviationReason || '';
}

/** 新建：同一业务日、按 sortOrder 的上一班次若已有日報，開始 = 其終了時刻（与填报人无关）；可手改 */
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
  form.taxFreeTier1Count = 0;
  form.taxFreeTier2Count = 0;
  form.taxFreeTier3Count = 0;
  form.newageYen = 0;
  form.airpayQrYen = 0;
  form.cashInDrawerYen = 0;
  form.deviationReason = '';
  if (persons.value[0]) form.responsiblePersonId = persons.value[0].id;
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
  ddnFile.value = null;
  taxFile.value = null;
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
    console.error(e);
    const err = e as { response?: { data?: { message?: string } } };
    ElMessage.error(err.response?.data?.message || '読み込みに失敗しました');
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

async function goToConfirm() {
  if (!form.responsiblePersonId) {
    ElMessage.error('責任者を選択してください');
    return;
  }
  if (form.cashInDrawerYen < registerFloatAmount.value) {
    ElMessage.error('レジ実点（底銭込）はレジ底銭以上の金額を入力してください');
    return;
  }
  const sm = parseHmToMinute(form.startStr);
  const em = parseHmToMinute(form.endStr);
  if (sm === em) {
    ElMessage.error('開始と終了を同じ時刻にはできません');
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
    taxFreeTier1Count: form.taxFreeTier1Count,
    taxFreeTier2Count: form.taxFreeTier2Count,
    taxFreeTier3Count: form.taxFreeTier3Count,
    newageYen: form.newageYen,
    airpayQrYen: form.airpayQrYen,
    cashTotalYen: cashNetForReport.value,
    deviationReason: form.deviationReason || undefined,
  };
}

async function submit() {
  if (!form.responsiblePersonId) {
    ElMessage.error('責任者を選択してください');
    return;
  }
  if (form.cashInDrawerYen < registerFloatAmount.value) {
    ElMessage.error('レジ実点（底銭込）はレジ底銭以上の金額を入力してください');
    return;
  }
  if (!editId.value && (!ddnFile.value || !taxFile.value)) {
    ElMessage.error('DDN・免税カードの写真を両方選択してください');
    return;
  }
  if (preview.value.deviationYen < 0) {
    const r = form.deviationReason?.trim();
    if (!r) {
      ElMessage.error('負の偏差の場合は理由を入力してください');
      return;
    }
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
      await http.post(`/daily-reports/${id}/photos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    ElMessage.success('提出しました');
    router.replace('/wm');
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    ElMessage.error(err.response?.data?.message || 'エラー');
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
        {{ step === 'confirm' ? '返回' : '戻る' }}
      </el-button>
      <h2>{{ pageTitle }} — {{ reportDate }}</h2>
    </header>

    <!-- 確認：入力内容の表＋計算偏差 -->
    <template v-if="!loading && step === 'confirm'">
      <el-descriptions title="入力内容の確認" border :column="1" class="summary">
        <el-descriptions-item label="班次">{{ shiftName }}</el-descriptions-item>
        <el-descriptions-item label="責任者">{{ personName }}</el-descriptions-item>
        <el-descriptions-item label="時間帯">
          {{ form.startStr }} — {{ form.endStr }}
        </el-descriptions-item>
        <el-descriptions-item label="チャージ・ナイト">
          {{ form.chargeNightPackYen }} 円
        </el-descriptions-item>
        <el-descriptions-item label="商品売上">
          {{ form.productSalesYen }} 円
        </el-descriptions-item>
        <el-descriptions-item label="総売上（計算）">
          {{ preview.totalSalesYen }} 円
        </el-descriptions-item>
        <el-descriptions-item label="免税カード（1〜3档 枚数）">
          {{ form.taxFreeTier1Count }} / {{ form.taxFreeTier2Count }} /
          {{ form.taxFreeTier3Count }}
        </el-descriptions-item>
        <el-descriptions-item label="免税カード額（計算・偏差に加算）">
          {{ preview.taxFreeCardAmountYen }} 円
        </el-descriptions-item>
        <el-descriptions-item label="Newage">{{ form.newageYen }} 円</el-descriptions-item>
        <el-descriptions-item label="Airpay+QR">{{ form.airpayQrYen }} 円</el-descriptions-item>
        <el-descriptions-item label="レジ実点（底銭込）">
          {{ form.cashInDrawerYen }} 円
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
        <el-descriptions-item v-if="form.deviationReason" label="偏差理由">
          {{ form.deviationReason }}
        </el-descriptions-item>
      </el-descriptions>
      <div class="confirm-actions">
        <el-button @click="backToForm">返回</el-button>
        <el-button type="primary" :loading="saving" @click="submit">提交</el-button>
      </div>
    </template>

    <el-form v-if="!loading && step === 'form'" label-width="200px" class="form">
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
        <p v-if="!editId" class="field-hint">
          业务日 = 白1→白2→夜班→次日早班（本页「日付」为白1 开始日；末班在次日清晨仍属同一业务日）。
          若上一班已有日报，开始时间默认取其结束时间（白1 会取前一业务日最后一班）；可随时修改。
          跨日时：结束可早于开始（表示次日），例如 23:00–07:10。
          <template v-if="startTimeFromPreviousShift">
            （当前已开始时间已按上一班结束时间填入）
          </template>
        </p>
      </el-form-item>
      <el-form-item label="チャージ・ナイト / 商品売上">
        <el-input-number v-model="form.chargeNightPackYen" :min="0" /> /
        <el-input-number v-model="form.productSalesYen" :min="0" />
      </el-form-item>
      <el-form-item label="免税カード（1〜3档 枚数）">
        <el-input-number v-model="form.taxFreeTier1Count" :min="0" />
        <el-input-number v-model="form.taxFreeTier2Count" :min="0" />
        <el-input-number v-model="form.taxFreeTier3Count" :min="0" />
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
      <el-form-item label="DDN写真">
        <input type="file" accept="image/*" @change="(e) => (ddnFile = (e.target as HTMLInputElement).files?.[0] || null)" />
      </el-form-item>
      <el-form-item label="免税カード写真">
        <input type="file" accept="image/*" @change="(e) => (taxFile = (e.target as HTMLInputElement).files?.[0] || null)" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="goToConfirm">確認</el-button>
      </el-form-item>
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
.form :deep(.el-input-number) {
  margin-right: 8px;
}
.summary {
  margin-bottom: 24px;
}
.deviation {
  font-size: 1.15rem;
  font-weight: 600;
}
.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.field-hint {
  margin: 8px 0 0;
  width: 100%;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}
</style>
