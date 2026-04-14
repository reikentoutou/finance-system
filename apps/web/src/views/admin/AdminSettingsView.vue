<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { http } from '@/api/http';
import { ElMessage, ElMessageBox } from 'element-plus';

type TaxTierRow = {
  id: string;
  denominationYen: number;
  sortOrder: number;
  active: boolean;
};

const registerFloat = ref(0);
const shifts = ref<{ id: string; name: string; sortOrder: number }[]>([]);
const persons = ref<{ id: string; name: string }[]>([]);
const newPerson = ref('');
const taxTiers = ref<TaxTierRow[]>([]);
const newTierDenom = ref<number | undefined>();

async function load() {
  try {
    const [{ data: s }, { data: st }, { data: p }, { data: tiers }] =
      await Promise.all([
        http.get('/meta/settings'),
        http.get('/meta/shifts'),
        http.get<{ id: string; name: string }[]>('/meta/responsible-persons'),
        http.get<TaxTierRow[]>('/meta/tax-tiers'),
      ]);
    registerFloat.value = s?.registerFloatAmount ?? 0;
    shifts.value = Array.isArray(st) ? st : [];
    persons.value = Array.isArray(p) ? p : [];
    taxTiers.value = Array.isArray(tiers) ? tiers : [];
  } catch (e: unknown) {
    console.error(e);
    const err = e as {
      message?: string;
      code?: string;
      response?: { status?: number; data?: { message?: string | string[] } };
    };
    const m = err.response?.data?.message;
    const detail = Array.isArray(m) ? m.join(', ') : m;
    const hint =
      err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')
        ? 'API に接続できません。`pnpm dev` で API（既定 :3000）が起動しているか確認してください。'
        : err.response?.status === 401
          ? 'ログインの有効期限切れの可能性があります。再ログインしてください。'
          : detail || err.message || 'マスタの読み込みに失敗しました';
    ElMessage.error(hint);
  }
}

onMounted(load);

async function saveFloat() {
  await http.patch('/meta/settings', { registerFloatAmount: registerFloat.value });
  ElMessage.success('レジ底銭を保存しました');
}

async function saveShift(row: { id: string; name: string }) {
  await http.patch('/meta/shifts', { id: row.id, name: row.name });
  ElMessage.success('シフト名を更新しました');
  load();
}

async function addPerson() {
  if (!newPerson.value.trim()) return;
  await http.post('/meta/responsible-persons', { name: newPerson.value.trim() });
  newPerson.value = '';
  ElMessage.success('追加しました');
  await load();
}

async function addTaxTier() {
  const d = newTierDenom.value;
  if (d == null || d < 1) {
    ElMessage.warning('面額（円）を 1 以上で入力してください');
    return;
  }
  try {
    await http.post('/meta/tax-tiers', { denominationYen: d });
    newTierDenom.value = undefined;
    ElMessage.success('券種を追加しました');
    await load();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string | string[] } } };
    const m = err.response?.data?.message;
    ElMessage.error(Array.isArray(m) ? m.join(', ') : m || '追加に失敗しました');
  }
}

async function saveTaxTier(row: TaxTierRow) {
  try {
    await http.patch('/meta/tax-tiers', {
      id: row.id,
      denominationYen: row.denominationYen,
      sortOrder: row.sortOrder,
    });
    ElMessage.success('券種を保存しました');
    await load();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string | string[] } } };
    const m = err.response?.data?.message;
    ElMessage.error(Array.isArray(m) ? m.join(', ') : m || '保存に失敗しました');
  }
}

async function deactivateTaxTier(row: TaxTierRow) {
  try {
    await ElMessageBox.confirm(
      `面額 ${row.denominationYen.toLocaleString('ja-JP')} 円の券種を無効化しますか？\n既存日報の枚数データは残りますが、新規・編集フォームの入力欄には出ません。`,
      '10％クーポン券種の無効化',
      {
        confirmButtonText: '無効化する',
        cancelButtonText: 'キャンセル',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  try {
    await http.patch('/meta/tax-tiers', { id: row.id, active: false });
    ElMessage.success('無効化しました');
    await load();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string | string[] } } };
    const m = err.response?.data?.message;
    ElMessage.error(Array.isArray(m) ? m.join(', ') : m || '更新に失敗しました');
  }
}

async function reactivateTaxTier(row: TaxTierRow) {
  try {
    await http.patch('/meta/tax-tiers', { id: row.id, active: true });
    ElMessage.success('有効にしました');
    await load();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string | string[] } } };
    const m = err.response?.data?.message;
    ElMessage.error(Array.isArray(m) ? m.join(', ') : m || '更新に失敗しました');
  }
}

async function removePerson(row: { id: string; name: string }) {
  try {
    await ElMessageBox.confirm(
      `「${row.name}」を責任者一覧から削除（無効化）しますか？\n既存の日報のスナップショットには影響しません。`,
      '責任者の削除',
      {
        confirmButtonText: '削除する',
        cancelButtonText: 'キャンセル',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  try {
    await http.patch(`/meta/responsible-persons/${row.id}/deactivate`);
    ElMessage.success('削除しました');
    await load();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string | string[] } } };
    const m = err.response?.data?.message;
    ElMessage.error(Array.isArray(m) ? m.join(', ') : m || '削除に失敗しました');
  }
}
</script>

<template>
  <div>
    <h3>レジ底銭（全店共通）</h3>
    <el-input-number v-model="registerFloat" :min="0" />
    <el-button type="primary" style="margin-left: 8px" @click="saveFloat">保存</el-button>

    <h3 style="margin-top: 24px">10％クーポン券種（面額マスタ）</h3>
    <p class="section-hint">
      表示順は sortOrder の昇順です。無効化は削除ではなく非表示（履歴の枚数・計算は維持）です。
    </p>
    <el-table :data="taxTiers" size="small" style="max-width: 640px; margin-bottom: 12px">
      <el-table-column prop="sortOrder" label="順" width="72">
        <template #default="{ row }">
          <el-input-number v-model="row.sortOrder" :min="0" :controls="false" />
        </template>
      </el-table-column>
      <el-table-column label="面額（円）" min-width="120">
        <template #default="{ row }">
          <el-input-number v-model="row.denominationYen" :min="1" :controls="false" />
        </template>
      </el-table-column>
      <el-table-column label="状態" width="88">
        <template #default="{ row }">
          <el-tag :type="row.active ? 'success' : 'info'" size="small">
            {{ row.active ? '有効' : '無効' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="" min-width="200" align="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="saveTaxTier(row)">保存</el-button>
          <el-button
            v-if="row.active"
            link
            type="danger"
            @click="deactivateTaxTier(row)"
          >
            無効化
          </el-button>
          <el-button
            v-else
            link
            type="primary"
            @click="reactivateTaxTier(row)"
          >
            有効化
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="add-row">
      <span style="font-size: 13px; color: var(--el-text-color-secondary)"
        >新規面額（円）</span
      >
      <el-input-number v-model="newTierDenom" :min="1" :controls="false" />
      <el-button type="primary" @click="addTaxTier">券種を追加</el-button>
    </div>

    <h3 style="margin-top: 24px">シフト名</h3>
    <el-table :data="shifts" size="small">
      <el-table-column prop="sortOrder" label="#" width="60" />
      <el-table-column label="名称">
        <template #default="{ row }">
          <el-input v-model="row.name" style="width: 200px" />
          <el-button link type="primary" @click="saveShift(row)">保存</el-button>
        </template>
      </el-table-column>
    </el-table>

    <h3 style="margin-top: 24px">責任者</h3>
    <p class="section-hint">日報フォームの選択肢として使います。削除すると新規日報では選べなくなります。</p>
    <el-table :data="persons" size="small" style="max-width: 520px; margin-bottom: 12px">
      <el-table-column prop="name" label="名前" min-width="160" />
      <el-table-column label="" width="100" align="right">
        <template #default="{ row }">
          <el-button link type="danger" @click="removePerson(row)">削除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="add-row">
      <el-input v-model="newPerson" placeholder="新規名前" style="width: 240px" />
      <el-button type="primary" @click="addPerson">追加</el-button>
    </div>
  </div>
</template>

<style scoped>
.section-hint {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  max-width: 560px;
  line-height: 1.45;
}
.add-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
