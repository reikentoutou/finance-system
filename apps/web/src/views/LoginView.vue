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
    <div class="panel fs-anim-fade-lift">
      <p class="eyebrow">財務日報</p>
      <h1 class="title">ログイン</h1>
      <p class="lede">業務用アカウントでサインインしてください。</p>
      <el-card class="card" shadow="never">
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
          <el-button type="primary" native-type="submit" :loading="loading" class="submit">
            ログイン
          </el-button>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  min-height: var(--fs-vh-100);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background:
    radial-gradient(1200px 600px at 12% -10%, rgba(22, 95, 88, 0.14), transparent 55%),
    radial-gradient(900px 480px at 88% 110%, rgba(139, 90, 43, 0.08), transparent 50%),
    var(--fs-page);
}

.panel {
  width: min(420px, 100%);
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--fs-muted);
}

.title {
  margin: 0 0 8px;
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--fs-ink);
  line-height: 1.25;
}

.lede {
  margin: 0 0 18px;
  font-size: 0.9rem;
  color: var(--fs-muted);
  line-height: 1.5;
  max-width: 36ch;
}

.card {
  border-radius: var(--fs-radius-md);
  border: 1px solid var(--fs-border);
  background: var(--fs-surface-elevated);
  box-shadow: var(--fs-shadow-soft);
}

@media (prefers-reduced-motion: no-preference) {
  .card {
    transition:
      border-color 0.22s var(--fs-ease-out, cubic-bezier(0.25, 1, 0.5, 1)),
      box-shadow 0.28s var(--fs-ease-out, cubic-bezier(0.25, 1, 0.5, 1));
  }
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .card:hover {
    border-color: var(--fs-border-strong);
    box-shadow:
      0 1px 2px rgba(28, 26, 22, 0.06),
      0 16px 40px rgba(28, 26, 22, 0.09);
  }
}

.card :deep(.el-card__body) {
  padding: 22px 22px 20px;
}

.card :deep(.el-form-item__label) {
  color: var(--fs-muted);
  font-weight: 500;
}

.submit {
  width: 100%;
  margin-top: 4px;
  height: 42px;
  font-weight: 600;
}

@media (prefers-reduced-motion: no-preference) {
  .submit:not(:disabled):active {
    transform: translateY(1px);
  }

  .submit {
    transition: transform 0.12s var(--fs-ease-out, cubic-bezier(0.25, 1, 0.5, 1));
  }
}
</style>
