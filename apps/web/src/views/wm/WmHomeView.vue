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
      <div class="bar-titles">
        <p class="eyebrow">財務日報</p>
        <h1 class="title">日報（網管）</h1>
      </div>
      <div class="right">
        <span class="user">{{ auth.user?.username }}</span>
        <el-button link type="primary" class="logout" @click="logout">ログアウト</el-button>
      </div>
    </header>
    <div class="body">
      <div class="row">
        <span class="row-label">業務日（東京）</span>
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
  background: var(--fs-page);
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 22px 14px 26px;
  background: var(--fs-surface-elevated);
  border-bottom: 1px solid var(--fs-border);
  box-shadow: 0 1px 0 rgba(28, 26, 22, 0.04);
}
.bar-titles {
  min-width: 0;
}
.eyebrow {
  margin: 0 0 2px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--fs-muted);
}
.title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--fs-ink);
  line-height: 1.3;
}
.body {
  max-width: 1120px;
  margin: 0 auto;
  padding: 22px 26px 40px;
}
.row {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.row-label {
  font-weight: 600;
  color: var(--fs-ink);
}
.grid .cell {
  cursor: pointer;
  min-height: 128px;
  border-radius: var(--fs-radius-md);
  border: 1px solid var(--fs-border);
  background: var(--fs-surface-elevated);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}
.grid .cell:hover {
  border-color: var(--fs-border-strong);
  box-shadow: var(--fs-shadow-soft);
  transform: translateY(-1px);
}
.grid .cell :deep(.el-card__body) {
  padding: 16px 16px 14px;
}
.t {
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--fs-ink);
  font-size: 0.95rem;
}
.ok {
  color: var(--fs-success-ink);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--fs-muted);
  line-height: 1.45;
}
.empty {
  color: var(--fs-faint);
  font-size: 0.9rem;
}
.right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.user {
  font-weight: 600;
  color: var(--fs-ink);
}
.logout {
  font-weight: 500;
}
</style>
