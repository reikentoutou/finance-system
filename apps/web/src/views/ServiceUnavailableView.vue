<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useSetupStore } from '@/stores/setup';

const router = useRouter();
const route = useRoute();
const setup = useSetupStore();
const retrying = ref(false);

async function retry() {
  retrying.value = true;
  try {
    const ok = await setup.fetchStatus(true);
    if (setup.statusFetchFailed || ok === null) {
      ElMessage.warning('仍无法连接后端，请确认 API 已启动（默认端口 3000）。');
      return;
    }
    const next = (route.query.redirect as string) || '/login';
    await router.replace(next);
  } finally {
    retrying.value = false;
  }
}
</script>

<template>
  <div class="wrap">
    <h1>无法连接后端</h1>
    <p class="lead">
      浏览器无法访问 API（例如 <code>http://127.0.0.1:3000</code>）。请先在项目根目录启动
      Nest API，或使用同时启动前后端的命令。
    </p>
    <pre class="cmd">cd 项目根目录 && pnpm dev:api</pre>
    <p class="hint">或一并启动：<code>pnpm dev</code>（API + Web）</p>
    <el-button type="primary" :loading="retrying" @click="retry">重试</el-button>
  </div>
</template>

<style scoped>
.wrap {
  max-width: 520px;
  margin: 48px auto;
  padding: 0 16px;
  font-family: system-ui, sans-serif;
}
h1 {
  font-size: 1.35rem;
  margin: 0 0 12px;
}
.lead {
  line-height: 1.55;
  color: #444;
  margin: 0 0 16px;
}
.cmd {
  background: #f4f4f5;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 13px;
  overflow-x: auto;
  margin: 0 0 12px;
}
.hint {
  font-size: 13px;
  color: #666;
  margin: 0 0 20px;
}
code {
  font-size: 0.92em;
  padding: 1px 6px;
  background: #eee;
  border-radius: 4px;
}
</style>
