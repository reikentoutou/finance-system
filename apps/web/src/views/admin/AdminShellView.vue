<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

function logout() {
  auth.logout();
  router.replace('/login');
}
</script>

<template>
  <el-container class="layout">
    <el-aside width="200px">
      <el-menu router :default-active="$route.path">
        <el-menu-item index="/admin/daily">全日報</el-menu-item>
        <el-menu-item index="/admin/settings">マスタ・設定</el-menu-item>
        <el-menu-item index="/admin/analytics">集計・エクスポート</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="head">
        <span>管理者 {{ auth.user?.username }}</span>
        <el-button link type="primary" @click="logout">ログアウト</el-button>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  min-height: 100vh;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}
</style>
