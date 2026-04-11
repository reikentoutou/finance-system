<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const loading = ref(false);
const form = reactive({ username: '', password: '' });

async function submit() {
  loading.value = true;
  try {
    await auth.login(form.username, form.password);
    const r = route.query.redirect as string | undefined;
    if (r) router.replace(r);
    else if (auth.isAdmin) router.replace('/admin');
    else router.replace('/wm');
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
