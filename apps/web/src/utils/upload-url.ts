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

/** 用于预览：URL 路径是否为常见图片后缀（不含 query） */
export function isImageUploadUrl(url: string): boolean {
  const u = url.split('?')[0]?.toLowerCase() ?? '';
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/.test(u);
}

/** DDN：画像または PDF */
export function isAllowedReportAttachmentFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return true;
  if (file.type === 'application/pdf') return true;
  if (file.type.startsWith('image/')) return true;
  return false;
}

/** 10％クーポン添付：画像・PDF に加え TXT / Excel */
export function isAllowedTaxFreeReportAttachmentFile(file: File): boolean {
  if (isAllowedReportAttachmentFile(file)) return true;
  const name = file.name.toLowerCase();
  const mt = (file.type || '').toLowerCase();
  if (name.endsWith('.txt') || mt === 'text/plain') return true;
  if (
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    mt === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mt === 'application/vnd.ms-excel'
  ) {
    return true;
  }
  return false;
}
