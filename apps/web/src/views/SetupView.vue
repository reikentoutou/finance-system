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
    return 'API に接続できません。本機で pnpm dev を実行し、API と Web の両方を起動してください。';
  }
  return err.message || '保存に失敗しました';
}

async function submit() {
  if (!form.webmasterPassword || form.webmasterPassword.length < 4) {
    ElMessage.error('網管パスワードは 4 文字以上にしてください');
    return;
  }
  if (!form.adminPassword || form.adminPassword.length < 4) {
    ElMessage.error('管理者パスワードは 4 文字以上にしてください');
    return;
  }
  if (form.webmasterUsername.trim() === form.adminUsername.trim()) {
    ElMessage.error('網管と管理者のユーザー名は同じにできません');
    return;
  }
  loading.value = true;
  try {
    await http.post('/setup/bootstrap', { ...form });
    const completed = await setupStore.fetchStatus(true);
    if (setupStore.statusFetchFailed || completed === null) {
      ElMessage.warning(
        '初期化は完了した可能性がありますが、状態確認に失敗しました。ページを再読み込みしてください。',
      );
      return;
    }
    ElMessage.success('保存しました。ログインしてください');
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
      <p class="hint">網管と管理者のログイン名・パスワードを設定してください（4 文字以上）。</p>
      <el-form label-width="140px" @submit.prevent="submit">
        <el-form-item label="網管ユーザー名">
          <el-input v-model="form.webmasterUsername" autocomplete="username" />
        </el-form-item>
        <el-form-item label="網管パスワード">
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
  padding: 24px 16px;
  background: var(--fs-page);
}
.card {
  width: 480px;
  border-radius: var(--fs-radius-md);
  border: 1px solid var(--fs-border);
  box-shadow: var(--fs-shadow-soft);
}
.hint {
  color: var(--fs-muted);
  margin-bottom: 16px;
}
</style>
