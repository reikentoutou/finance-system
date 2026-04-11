<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { http } from '@/api/http';
import { ElMessage } from 'element-plus';

const registerFloat = ref(0);
const shifts = ref<{ id: string; name: string; sortOrder: number }[]>([]);
const newPerson = ref('');

async function load() {
  const [{ data: s }, { data: st }] = await Promise.all([
    http.get('/meta/settings'),
    http.get('/meta/shifts'),
  ]);
  registerFloat.value = s?.registerFloatAmount ?? 0;
  shifts.value = st;
}

onMounted(load);

async function saveFloat() {
  await http.patch('/meta/settings', { registerFloatAmount: registerFloat.value });
  ElMessage.success('底钱を保存しました');
}

async function saveShift(row: { id: string; name: string }) {
  await http.patch('/meta/shifts', { id: row.id, name: row.name });
  ElMessage.success('班次名を更新しました');
  load();
}

async function addPerson() {
  if (!newPerson.value.trim()) return;
  await http.post('/meta/responsible-persons', { name: newPerson.value.trim() });
  newPerson.value = '';
  ElMessage.success('追加しました');
}
</script>

<template>
  <div>
    <h3>底钱（全局）</h3>
    <el-input-number v-model="registerFloat" :min="0" />
    <el-button type="primary" style="margin-left: 8px" @click="saveFloat">保存</el-button>

    <h3 style="margin-top: 24px">班次名称</h3>
    <el-table :data="shifts" size="small">
      <el-table-column prop="sortOrder" label="#" width="60" />
      <el-table-column label="名称">
        <template #default="{ row }">
          <el-input v-model="row.name" style="width: 200px" />
          <el-button link type="primary" @click="saveShift(row)">保存</el-button>
        </template>
      </el-table-column>
    </el-table>

    <h3 style="margin-top: 24px">责任者</h3>
    <el-input v-model="newPerson" placeholder="新規名前" style="width: 240px" />
    <el-button type="primary" @click="addPerson">追加</el-button>
  </div>
</template>
