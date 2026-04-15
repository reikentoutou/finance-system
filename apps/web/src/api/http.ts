import axios from 'axios';

/**
 * - 构建时**未**设置 VITE_API_BASE：开发与生产均默认直连 http://127.0.0.1:3000（避免桌面包 / 双端口静态站下
 *   baseURL 为空时请求落到 5173，静态服务回退 index.html → axios 解析 JSON 失败）。
 * - 构建时**显式**设置 VITE_API_BASE（含空字符串）：原样使用；空字符串表示与前端同域或由网关反代。
 * - 需要走代理时可在 .env 设 VITE_API_BASE（例如 /wm/api）
 */
const fromEnv = import.meta.env.VITE_API_BASE;
const baseURL = fromEnv !== undefined ? fromEnv : 'http://127.0.0.1:3000';

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
