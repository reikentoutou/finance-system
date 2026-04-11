<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { http } from '@/api/http';
import { useSetupStore } from '@/stores/setup';

const router = useRouter();
const setupStore = useSetupStore();
const loading = ref(false);
const form = reactive({
  webmasterUsername: 'webmaster',
  webmasterPassword: '',
  adminUsername: 'admin',
  adminPassword: '',
});

function errMessage(e: unknown): string {
  const err = e as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const m = err.response?.data?.message;
  if (Array.isArray(m)) return m.join(' ');
  if (typeof m === 'string') return m;
  if (err.message?.includes('Network Error')) {
    return '无法连接 API。请先在本机运行 pnpm dev（需同时启动 API 与 Web）。';
  }
  return err.message || '保存失败';
}

async function submit() {
  if (!form.webmasterPassword || form.webmasterPassword.length < 4) {
    ElMessage.error('网管密码至少 4 个字符');
    return;
  }
  if (!form.adminPassword || form.adminPassword.length < 4) {
    ElMessage.error('管理员密码至少 4 个字符');
    return;
  }
  if (form.webmasterUsername.trim() === form.adminUsername.trim()) {
    ElMessage.error('网管与管理员用户名不能相同');
    return;
  }
  loading.value = true;
  try {
    await http.post('/setup/bootstrap', { ...form });
    await setupStore.fetchStatus();
    ElMessage.success('已保存，请登录');
    await router.replace({ name: 'login' });
  } catch (e: unknown) {
    ElMessage.error(errMessage(e));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="wrap">
    <el-card class="card">
      <h2>初回セットアップ</h2>
      <p class="hint">网管と管理者のログイン名・パスワードを設定してください（4文字以上）。</p>
      <el-form label-width="140px" @submit.prevent="submit">
        <el-form-item label="网管ユーザー名">
          <el-input v-model="form.webmasterUsername" autocomplete="username" />
        </el-form-item>
        <el-form-item label="网管パスワード">
          <el-input
            v-model="form.webmasterPassword"
            type="password"
            show-password
            autocomplete="new-password"
          />
        </el-form-item>
        <el-form-item label="管理者ユーザー名">
          <el-input v-model="form.adminUsername" autocomplete="username" />
        </el-form-item>
        <el-form-item label="管理者パスワード">
          <el-input
            v-model="form.adminPassword"
            type="password"
            show-password
            autocomplete="new-password"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="submit">完了</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}
.card {
  width: 480px;
}
.hint {
  color: #666;
  margin-bottom: 16px;
}
</style>
