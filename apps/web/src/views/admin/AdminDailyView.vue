<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { http } from '@/api/http';
import { ElMessage } from 'element-plus';
import { todayTokyo, isoMonthsAgoTokyo } from '@/utils/tokyo';
import { httpErrorMessage } from '@/utils/http-error-message';

type Row = {
  id: string;
  reportDate: string;
  shiftId: string;
  shiftNameSnapshot: string;
  totalSalesYen: number;
  createdBy: { username: string };
};

const router = useRouter();
const loading = ref(true);
const rows = ref<Row[]>([]);
const expanded = ref<string[]>([]);

const byDate = computed(() => {
  const m = new Map<string, Row[]>();
  for (const r of rows.value) {
    const k = r.reportDate;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
});

async function load() {
  loading.value = true;
  try {
    const { data } = await http.get<Row[]>('/daily-reports', {
      params: {
        from: isoMonthsAgoTokyo(24),
        to: todayTokyo(),
        limit: 3000,
      },
    });
    rows.value = data;
  } catch (e: unknown) {
    ElMessage.error(
      httpErrorMessage(e, '日報一覧の読み込みに失敗しました'),
    );
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const dlg = ref(false);
const newForm = ref({
  reportDate: '',
  shiftId: '',
  createdByUserId: '',
});
const shifts = ref<{ id: string; name: string }[]>([]);
const webmasters = ref<{ id: string; username: string }[]>([]);

async function openNew() {
  const [{ data: s }, { data: w }] = await Promise.all([
    http.get('/meta/shifts'),
    http.get('/meta/webmaster-users'),
  ]);
  shifts.value = s;
  webmasters.value = w;
  newForm.value = {
    reportDate: '',
    shiftId: s[0]?.id || '',
    createdByUserId: w[0]?.id || '',
  };
  dlg.value = true;
}

function confirmNew() {
  if (!newForm.value.reportDate || !newForm.value.shiftId || !newForm.value.createdByUserId) {
    ElMessage.error('日付・シフト・網管を指定してください');
    return;
  }
  dlg.value = false;
  router.push({
    path: '/admin/report/new',
    query: {
      reportDate: newForm.value.reportDate,
      shiftId: newForm.value.shiftId,
      createdByUserId: newForm.value.createdByUserId,
    },
  });
}

function edit(id: string) {
  router.push(`/admin/report/${id}`);
}
</script>

<template>
  <div v-loading="loading" class="page">
    <div class="toolbar">
      <div class="toolbar-text">
        <h2 class="page-title">全日報</h2>
        <p class="page-hint">業務日ごとに折りたたみ表示されます。</p>
      </div>
      <el-button type="primary" @click="openNew">空シフトを補録</el-button>
    </div>
    <el-collapse v-model="expanded">
      <el-collapse-item v-for="[date, list] in byDate" :key="date" :name="date">
        <template #title>
          <strong>{{ date }}</strong>
          <span class="cnt">（{{ list.length }} 件）</span>
        </template>
        <el-table :data="list" size="small" max-height="520">
          <el-table-column prop="shiftNameSnapshot" label="シフト" width="100" />
          <el-table-column prop="totalSalesYen" label="総売上" />
          <el-table-column prop="createdBy.username" label="提出者" />
          <el-table-column label="" width="120">
            <template #default="{ row }">
              <el-button type="primary" link @click="edit(row.id)">編集</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>

    <el-dialog v-model="dlg" title="補録（新規行）" width="480px">
      <el-form label-width="120px">
        <el-form-item label="業務日">
          <el-date-picker v-model="newForm.reportDate" value-format="YYYY-MM-DD" type="date" />
        </el-form-item>
        <el-form-item label="シフト">
          <el-select v-model="newForm.shiftId">
            <el-option v-for="s in shifts" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="提出元（網管）">
          <el-select v-model="newForm.createdByUserId">
            <el-option v-for="w in webmasters" :key="w.id" :label="w.username" :value="w.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg = false">キャンセル</el-button>
        <el-button type="primary" @click="confirmNew">フォームへ</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page {
  padding-bottom: 8px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--fs-border);
}
.toolbar-text {
  min-width: 0;
}
.page-title {
  margin: 0 0 4px;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--fs-ink);
}
.page-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--fs-muted);
  line-height: 1.45;
  max-width: 48ch;
}
.cnt {
  color: var(--fs-muted);
  font-weight: 500;
  margin-left: 8px;
}

.page :deep(.el-collapse) {
  border-color: var(--fs-border);
  border-radius: var(--fs-radius-sm);
  overflow: hidden;
  background: var(--fs-surface-elevated);
}

.page :deep(.el-collapse-item__header) {
  font-size: 0.95rem;
  padding: 12px 16px;
  background: var(--fs-surface);
}

.page :deep(.el-collapse-item__wrap) {
  border-color: var(--fs-border);
}

.page :deep(.el-table) {
  --el-table-border-color: var(--fs-border);
  --el-table-header-bg-color: var(--fs-surface);
}
</style>
