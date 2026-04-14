import { http } from '@/api/http';

/** 假定 DB 等处以 `/uploads/xxx` 形式保存路径 */
export function resolveUploadedFileUrl(
  key: string | null | undefined,
): string | null {
  if (!key?.trim()) return null;
  const path = key.startsWith('/') ? key : `/${key}`;
  const base = (http.defaults.baseURL as string | undefined) ?? '';
  if (!base) return path;
  return `${base.replace(/\/$/, '')}${path}`;
}

export function isPdfUploadUrl(url: string): boolean {
  const u = url.split('?')[0]?.toLowerCase() ?? '';
  return u.endsWith('.pdf');
}

/** 日报附件允许的文件类型（图片或 PDF） */
export function isAllowedReportAttachmentFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return true;
  if (file.type === 'application/pdf') return true;
  if (file.type.startsWith('image/')) return true;
  return false;
}
