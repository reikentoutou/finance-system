import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSetupStore } from '@/stores/setup';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/setup',
      name: 'setup',
      component: () => import('@/views/SetupView.vue'),
    },
    {
      path: '/service-unavailable',
      name: 'service-unavailable',
      component: () => import('@/views/ServiceUnavailableView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/wm',
      name: 'wm',
      component: () => import('@/views/wm/WmHomeView.vue'),
      meta: { role: 'WEBMASTER' },
    },
    {
      path: '/wm/report/:date/:shiftId',
      name: 'wm-report',
      component: () => import('@/views/wm/DailyFormView.vue'),
      meta: { role: 'WEBMASTER' },
    },
    {
      path: '/wm/report/edit/:id',
      name: 'wm-report-edit',
      component: () => import('@/views/wm/DailyFormView.vue'),
      meta: { role: 'WEBMASTER' },
    },
    {
      path: '/admin/report/new',
      name: 'admin-report-new',
      component: () => import('@/views/admin/AdminReportFormView.vue'),
      meta: { role: 'ADMIN' },
    },
    {
      path: '/admin/report/:id',
      name: 'admin-report-edit',
      component: () => import('@/views/admin/AdminReportFormView.vue'),
      meta: { role: 'ADMIN' },
    },
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminShellView.vue'),
      meta: { role: 'ADMIN' },
      children: [
        { path: '', name: 'admin', redirect: '/admin/daily' },
        {
          path: 'daily',
          name: 'admin-daily',
          component: () => import('@/views/admin/AdminDailyView.vue'),
        },
        {
          path: 'settings',
          name: 'admin-settings',
          component: () => import('@/views/admin/AdminSettingsView.vue'),
        },
        {
          path: 'analytics',
          name: 'admin-analytics',
          component: () => import('@/views/admin/AnalyticsView.vue'),
        },
      ],
    },
    { path: '/', redirect: '/login' },
  ],
});

router.beforeEach(async (to) => {
  const setup = useSetupStore();
  if (setup.setupCompleted === null) {
    await setup.fetchStatus();
  }
  if (setup.statusFetchFailed) {
    if (to.name === 'service-unavailable') return true;
    return {
      name: 'service-unavailable',
      query: to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : {},
    };
  }
  if (
    !setup.setupCompleted &&
    to.name !== 'setup' &&
    to.name !== 'service-unavailable'
  ) {
    return { name: 'setup' };
  }
  if (setup.setupCompleted && to.name === 'setup') {
    return { name: 'login' };
  }
  const auth = useAuthStore();
  const publicNames = ['login', 'setup', 'service-unavailable'];
  if (publicNames.includes(String(to.name))) return true;
  if (!auth.token) return { name: 'login', query: { redirect: to.fullPath } };
  const need = to.meta.role;
  if (need && auth.user?.role !== need) {
    return auth.user?.role === 'ADMIN' ? { name: 'admin' } : { name: 'wm' };
  }
  return true;
});

export default router;
