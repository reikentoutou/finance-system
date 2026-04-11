<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { http } from '@/api/http';
import { useAuthStore } from '@/stores/auth';
import { todayTokyo } from '@/utils/tokyo';

const auth = useAuthStore();
const router = useRouter();

const shifts = ref<{ id: string; name: string; sortOrder: number }[]>([]);
const reportDate = ref(todayTokyo());
const reports = ref<
  {
    id: string;
    shiftId: string;
    totalSalesYen: number;
    timeRangeLabelSnapshot: string;
  }[]
>([]);

const byShift = computed(() => {
  const m = new Map<string, (typeof reports.value)[0]>();
  for (const r of reports.value) m.set(r.shiftId, r);
  return m;
});

async function load() {
  const [{ data: s }, { data: list }] = await Promise.all([
    http.get('/meta/shifts'),
    http.get('/daily-reports', { params: { reportDate: reportDate.value } }),
  ]);
  shifts.value = s;
  reports.value = list;
}

function goShift(shiftId: string) {
  const ex = byShift.value.get(shiftId);
  if (ex) router.push(`/wm/report/edit/${ex.id}`);
  else router.push(`/wm/report/${reportDate.value}/${shiftId}`);
}

onMounted(load);
watch(reportDate, load);

function logout() {
  auth.logout();
  router.replace('/login');
}
</script>

<template>
  <div class="page">
    <header class="bar">
      <h1>日報（网管）</h1>
      <div class="right">
        <span>{{ auth.user?.username }}</span>
        <el-button link type="primary" @click="logout">ログアウト</el-button>
      </div>
    </header>
    <div class="body">
      <div class="row">
        <span>业务日（东京）</span>
        <el-date-picker v-model="reportDate" value-format="YYYY-MM-DD" type="date" />
      </div>
      <el-row :gutter="16" class="grid">
        <el-col v-for="sh in shifts" :key="sh.id" :span="6">
          <el-card shadow="hover" class="cell" @click="goShift(sh.id)">
            <div class="t">{{ sh.name }}</div>
            <div v-if="byShift.get(sh.id)" class="ok">
              売上 {{ byShift.get(sh.id)!.totalSalesYen }} 円
              <div class="sub">{{ byShift.get(sh.id)!.timeRangeLabelSnapshot }}</div>
            </div>
            <div v-else class="empty">未入力・クリックで入力</div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}
.body {
  padding: 20px;
}
.row {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.grid .cell {
  cursor: pointer;
  min-height: 120px;
}
.t {
  font-weight: 600;
  margin-bottom: 8px;
}
.ok {
  color: #0a0;
}
.sub {
  font-size: 12px;
  color: #666;
}
.empty {
  color: #999;
}
.right {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
