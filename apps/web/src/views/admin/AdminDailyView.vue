<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { http } from '@/api/http';
import { ElMessage } from 'element-plus';

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
      params: { from: '2000-01-01', to: '2099-12-31' },
    });
    rows.value = data;
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
    ElMessage.error('日付・班次・网管を指定してください');
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
  <div v-loading="loading">
    <div class="toolbar">
      <el-button type="primary" @click="openNew">空班次を補録</el-button>
    </div>
    <el-collapse v-model="expanded">
      <el-collapse-item v-for="[date, list] in byDate" :key="date" :name="date">
        <template #title>
          <strong>{{ date }}</strong>
          <span class="cnt">（{{ list.length }} 件）</span>
        </template>
        <el-table :data="list" size="small">
          <el-table-column prop="shiftNameSnapshot" label="班次" width="100" />
          <el-table-column prop="totalSalesYen" label="総売上" />
          <el-table-column prop="createdBy.username" label="原填报" />
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
        <el-form-item label="业务日">
          <el-date-picker v-model="newForm.reportDate" value-format="YYYY-MM-DD" type="date" />
        </el-form-item>
        <el-form-item label="班次">
          <el-select v-model="newForm.shiftId">
            <el-option v-for="s in shifts" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="归属网管">
          <el-select v-model="newForm.createdByUserId">
            <el-option v-for="w in webmasters" :key="w.id" :label="w.username" :value="w.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg = false">取消</el-button>
        <el-button type="primary" @click="confirmNew">フォームへ</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 12px;
}
.cnt {
  color: #888;
  margin-left: 8px;
}
</style>
