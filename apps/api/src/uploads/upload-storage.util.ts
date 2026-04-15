import { join, normalize, relative, resolve } from 'path';
import { unlink } from 'fs/promises';

export function getUploadDir(): string {
  return process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
}

/**
 * 删除旧附件文件。key 须为 `/uploads/<filename>`（与 multer 落盘文件名一致），且不含子路径，避免越权删除。
 */
export async function safeUnlinkUploadByKey(key: string, uploadDir: string): Promise<void> {
  const trimmed = key.trim();
  const m = trimmed.match(/^(?:\/)?uploads\/([^/\\]+)$/i);
  if (!m) return;
  const name = m[1];
  if (!name || name.includes('..')) return;
  if (normalize(name) !== name) return;

  const dir = resolve(uploadDir);
  const abs = resolve(join(dir, name));
  const rel = relative(dir, abs);
  if (rel.startsWith('..') || rel === '') return;

  try {
    await unlink(abs);
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'code' in e ? (e as NodeJS.ErrnoException).code : undefined;
    if (code !== 'ENOENT') throw e;
  }
}
