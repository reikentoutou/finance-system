import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import { dirname, join, relative, resolve, sep } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import type { Response } from 'express';
import { finished } from 'node:stream/promises';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { PrismaService } from '../prisma/prisma.service';
import { getUploadDir } from '../uploads/upload-storage.util';

const BACKUP_FORMAT = 'finance-system-backup-v1';
const ZIP_ENTRY_DB = 'sqlite/app.sqlite';
const ZIP_ENTRY_MANIFEST = 'manifest.json';

type DbListRow = { seq: number; name: string; file: string };

/** 拒绝路径穿越、绝对路径、盘符根路径等（ZIP Slip 对策） */
function assertSafeZipEntryPath(extractRoot: string, entryName: string): string {
  const norm = entryName.replace(/\\/g, '/').replace(/^\/+/, '');
  if (norm.includes('\0')) {
    throw new BadRequestException('ZIP 内に不正なエントリ名が含まれています。');
  }
  if (/^[a-zA-Z]:\//.test(norm) || /^[a-zA-Z]:\\/.test(entryName)) {
    throw new BadRequestException('ZIP 内に絶対パスが含まれています。');
  }
  const segments = norm.split('/').filter((s) => s.length > 0);
  if (segments.some((s) => s === '..')) {
    throw new BadRequestException('ZIP 内に不正なパス (..) が含まれています。');
  }
  const abs = resolve(join(extractRoot, ...segments));
  const base = resolve(extractRoot);
  const rel = relative(base, abs);
  if (rel.startsWith(`..${sep}`) || rel === '..') {
    throw new BadRequestException('ZIP 内のパスが解凍先の外に出るエントリがあります。');
  }
  return abs;
}

@Injectable()
export class MaintenanceService {
  private exportImportLock = false;

  constructor(private readonly prisma: PrismaService) {}

  private async getMainSqlitePath(): Promise<string> {
    const rows = (await this.prisma.$queryRawUnsafe(
      'PRAGMA database_list',
    )) as DbListRow[];
    const main = rows.find((r) => r.name === 'main');
    if (!main?.file) {
      throw new BadRequestException('現在の接続から SQLite ファイルパスを取得できません。');
    }
    return main.file;
  }

  private listUploadFilesRecursive(root: string): string[] {
    if (!existsSync(root)) return [];
    const out: string[] = [];
    for (const name of readdirSync(root, { withFileTypes: true })) {
      const p = join(root, name.name);
      if (name.isDirectory()) {
        out.push(...this.listUploadFilesRecursive(p));
      } else if (name.isFile()) {
        out.push(p);
      }
    }
    return out;
  }

  private emptyDirContents(dir: string) {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      rmSync(join(dir, name), { recursive: true, force: true });
    }
  }

  /** 校验每个条目路径后写入 extractRoot（不使用 extractAllTo，避免 ZIP Slip） */
  private extractZipEntriesSafely(zip: AdmZip, extractRoot: string): void {
    mkdirSync(extractRoot, { recursive: true });
    for (const e of zip.getEntries()) {
      const name = e.entryName;
      const target = assertSafeZipEntryPath(extractRoot, name);
      if (e.isDirectory) {
        mkdirSync(target, { recursive: true });
        continue;
      }
      let data: Buffer;
      try {
        data = e.getData();
      } catch {
        throw new BadRequestException(`ZIP エントリの読み取りに失敗しました: ${name}`);
      }
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, data);
    }
  }

  private openAdmZipOrThrow(source: string | Buffer): AdmZip {
    try {
      return new AdmZip(source);
    } catch {
      throw new BadRequestException('ZIP を読み取れません。ファイルが壊れている可能性があります。');
    }
  }

  async streamExportZip(res: Response): Promise<void> {
    if (this.exportImportLock) {
      throw new ServiceUnavailableException(
        '他のバックアップ処理が実行中です。完了してから再試行してください。',
      );
    }
    this.exportImportLock = true;
    const uploadRoot = resolve(getUploadDir());
    let dbPath: string;
    try {
      dbPath = await this.getMainSqlitePath();
    } catch (e) {
      this.exportImportLock = false;
      throw e;
    }
    if (!existsSync(dbPath)) {
      this.exportImportLock = false;
      throw new BadRequestException(`データベースファイルが見つかりません: ${dbPath}`);
    }

    const manifest = {
      format: BACKUP_FORMAT,
      exportedAt: new Date().toISOString(),
      sqliteEntry: ZIP_ENTRY_DB,
      uploadsPrefix: 'uploads/',
    };

    await this.prisma.$disconnect();
    try {
      const archive = archiver('zip', { zlib: { level: 6 } });
      const fname = `finance-system-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
      archive.pipe(res);
      archive.append(JSON.stringify(manifest, null, 2), { name: ZIP_ENTRY_MANIFEST });
      archive.file(dbPath, { name: ZIP_ENTRY_DB });
      if (existsSync(uploadRoot)) {
        for (const abs of this.listUploadFilesRecursive(uploadRoot)) {
          const rel = relative(uploadRoot, abs).replace(/\\/g, '/');
          if (!rel || rel.startsWith('..')) continue;
          archive.file(abs, { name: `uploads/${rel}` });
        }
      }
      await archive.finalize();
      await finished(archive);
    } catch (e) {
      try {
        if (!res.headersSent) {
          res.status(500).end();
        }
      } catch {
        /* ignore */
      }
      throw e;
    } finally {
      await this.prisma.$connect();
      this.exportImportLock = false;
    }
  }

  private readManifestOrThrow(manifestPath: string): { format: string } {
    let raw: string;
    try {
      raw = readFileSync(manifestPath, 'utf8');
    } catch {
      throw new BadRequestException(
        'ZIP に manifest.json がありません。本システムのエクスポートファイルを使用してください。',
      );
    }
    let manifest: unknown;
    try {
      manifest = JSON.parse(raw) as unknown;
    } catch {
      throw new BadRequestException('manifest.json が不正な JSON です。');
    }
    if (manifest === null || typeof manifest !== 'object' || !('format' in manifest)) {
      throw new BadRequestException('manifest.json の形式が不正です。');
    }
    return manifest as { format: string };
  }

  /** 假定 extractRoot 已安全解压；调用方已持有 exportImportLock 并在 finally 中释放与删目录 */
  private async finalizeImportFromExtractedTree(
    extractRoot: string,
  ): Promise<{ ok: true; message: string }> {
    const dbPath = await this.getMainSqlitePath();
    const uploadRoot = resolve(getUploadDir());
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dbBak = `${dbPath}.pre-restore-${stamp}`;

    const manifestPath = join(extractRoot, ZIP_ENTRY_MANIFEST);
    const manifest = this.readManifestOrThrow(manifestPath);
    if (manifest.format !== BACKUP_FORMAT) {
      throw new BadRequestException(
        `未対応のバックアップ形式です（format=${String(manifest.format)}）。`,
      );
    }
    const sqliteSrc = join(extractRoot, ZIP_ENTRY_DB);
    if (!existsSync(sqliteSrc)) {
      throw new BadRequestException(`ZIP に ${ZIP_ENTRY_DB} がありません。`);
    }
    const uploadsSrc = join(extractRoot, 'uploads');

    await this.prisma.$disconnect();

    try {
      if (existsSync(dbPath)) {
        copyFileSync(dbPath, dbBak);
      }
      copyFileSync(sqliteSrc, dbPath);
      if (existsSync(uploadsSrc)) {
        mkdirSync(uploadRoot, { recursive: true });
        this.emptyDirContents(uploadRoot);
        cpSync(uploadsSrc, uploadRoot, { recursive: true });
      }
    } catch (e) {
      try {
        if (existsSync(dbBak)) {
          copyFileSync(dbBak, dbPath);
        }
      } catch {
        /* ignore */
      }
      await this.prisma.$connect();
      throw e;
    }

    try {
      await this.prisma.$connect();
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      try {
        if (existsSync(dbBak)) {
          copyFileSync(dbBak, dbPath);
        }
      } catch {
        /* ignore */
      }
      await this.prisma.$connect();
      throw new BadRequestException(
        'リストア後のデータベースを開けません。ZIP が壊れているかスキーマと一致しません。' +
          ' *.pre-restore-* バックアップから手動復元を検討してください。',
      );
    }

    return {
      ok: true,
      message:
        'リストアが完了しました。他端末のセッションは無効になる場合があります。ブラウザを再読み込みし、必要なら再ログインしてください。',
    };
  }

  async importFromZipBuffer(buffer: Buffer): Promise<{ ok: true; message: string }> {
    if (this.exportImportLock) {
      throw new ServiceUnavailableException(
        '他のバックアップ処理が実行中です。完了してから再試行してください。',
      );
    }
    this.exportImportLock = true;
    const extractRoot = join(tmpdir(), `fs-import-${randomBytes(8).toString('hex')}`);
    mkdirSync(extractRoot, { recursive: true });
    try {
      const zip = this.openAdmZipOrThrow(buffer);
      try {
        this.extractZipEntriesSafely(zip, extractRoot);
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
        throw new BadRequestException('ZIP の展開に失敗しました。');
      }
      return await this.finalizeImportFromExtractedTree(extractRoot);
    } finally {
      try {
        rmSync(extractRoot, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      this.exportImportLock = false;
    }
  }

  async importFromZipFilePath(zipPath: string): Promise<{ ok: true; message: string }> {
    if (!existsSync(zipPath)) {
      throw new BadRequestException('アップロードされたファイルが見つかりません。');
    }
    const st = statSync(zipPath);
    if (!st.isFile() || st.size < 32) {
      throw new BadRequestException('ZIP ファイルが無効です。');
    }
    const max = 220 * 1024 * 1024;
    if (st.size > max) {
      throw new BadRequestException(`ZIP が大きすぎます（上限 ${max} bytes）。`);
    }
    if (this.exportImportLock) {
      throw new ServiceUnavailableException(
        '他のバックアップ処理が実行中です。完了してから再試行してください。',
      );
    }
    this.exportImportLock = true;
    const extractRoot = join(tmpdir(), `fs-import-${randomBytes(8).toString('hex')}`);
    mkdirSync(extractRoot, { recursive: true });
    try {
      const zip = this.openAdmZipOrThrow(zipPath);
      try {
        this.extractZipEntriesSafely(zip, extractRoot);
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
        throw new BadRequestException('ZIP の展開に失敗しました。');
      }
      return await this.finalizeImportFromExtractedTree(extractRoot);
    } finally {
      try {
        rmSync(extractRoot, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      this.exportImportLock = false;
    }
  }
}
