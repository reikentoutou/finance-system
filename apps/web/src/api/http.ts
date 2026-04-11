import axios from 'axios';

/**
 * - 生产：默认 ''（与站点同域或由网关反代）
 * - 开发：默认直连 http://127.0.0.1:3000，避免依赖 Vite proxy（部分环境下 /daily-reports 未转发会 404）
 * - 需要走代理时可在 .env 设 VITE_API_BASE（例如 /wm/api）
 */
const baseURL =
  import.meta.env.VITE_API_BASE ??
  (import.meta.env.DEV ? 'http://127.0.0.1:3000' : '');

export const http = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token: string | null) {
  if (token) {
    http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete http.defaults.headers.common['Authorization'];
  }
}
