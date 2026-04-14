<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const loading = ref(false);
const form = reactive({ username: '', password: '' });

function loginErrorText(e: unknown): string {
  const err = e as {
    code?: string;
    message?: string;
    response?: { status?: number; data?: { message?: string | string[] } };
  };
  if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
    return '无法连接服务器。请确认 API 已启动（默认 http://127.0.0.1:3000）。';
  }
  const status = err.response?.status;
  const m = err.response?.data?.message;
  const detail = Array.isArray(m) ? m.join('；') : m;
  if (status === 401) {
    return detail || '用户名或密码错误';
  }
  if (status === 500) {
    return detail
      ? `服务器错误（500）：${detail}`
      : '服务器错误（500）。请查看 API 终端日志中的异常堆栈。';
  }
  return detail || err.message || '登录失败';
}

async function submit() {
  loading.value = true;
  try {
    await auth.login(form.username, form.password);
    const r = route.query.redirect as string | undefined;
    if (r) router.replace(r);
    else if (auth.isAdmin) router.replace('/admin');
    else router.replace('/wm');
  } catch (e: unknown) {
    ElMessage.error(loginErrorText(e));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="wrap">
    <el-card class="card">
      <h2>ログイン</h2>
      <el-form @submit.prevent="submit">
        <el-form-item label="ユーザー名">
          <el-input v-model="form.username" autocomplete="username" />
        </el-form-item>
        <el-form-item label="パスワード">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading">ログイン</el-button>
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
  width: 400px;
}
</style>
