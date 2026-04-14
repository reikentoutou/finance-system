import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { http, setAuthToken } from '@/api/http';
import { useSetupStore } from '@/stores/setup';

export type Role = 'WEBMASTER' | 'ADMIN';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<{ id: string; username: string; role: Role } | null>(
    localStorage.getItem('user')
      ? JSON.parse(localStorage.getItem('user') as string)
      : null,
  );

  if (token.value) setAuthToken(token.value);

  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  const isWebmaster = computed(() => user.value?.role === 'WEBMASTER');

  async function login(username: string, password: string) {
    const { data } = await http.post<{
      accessToken: string;
      user: { id: string; username: string; role: Role };
    }>('/auth/login', { username, password });
    token.value = data.accessToken;
    user.value = data.user;
    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setAuthToken(data.accessToken);
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthToken(null);
    useSetupStore().resetSetupCache();
  }

  return { token, user, isAdmin, isWebmaster, login, logout };
});
