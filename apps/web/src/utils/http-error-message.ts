/** 从接口错误对象中解析 message（含数组），供 ElMessage 等使用 */
export function httpErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: string | string[] } } };
  const m = err.response?.data?.message;
  if (Array.isArray(m)) return m.join('；');
  if (typeof m === 'string' && m.trim()) return m;
  return fallback;
}
