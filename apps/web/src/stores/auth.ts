import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { http, setAuthToken } from '@/api/http';
import { useSetupStore } from '@/stores/setup';

export type Role = 'WEBMASTER' | 'ADMIN';

export type AuthUser = { id: string; username: string; role: Role };

/** 解析 localStorage 中的 user JSON；格式非法或字段不符时返回 null，避免类型撒谎 */
function parseStoredUser(raw: string | null): AuthUser | null {
  if (raw == null || raw === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.username !== 'string') return null;
  if (o.role !== 'WEBMASTER' && o.role !== 'ADMIN') return null;
  return { id: o.id, username: o.username, role: o.role };
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<AuthUser | null>(parseStoredUser(localStorage.getItem('user')));

  if (token.value) setAuthToken(token.value);

  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  const isWebmaster = computed(() => user.value?.role === 'WEBMASTER');

  async function login(username: string, password: string) {
    const { data } = await http.post<{
      accessToken: string;
      user: AuthUser;
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
