<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { UploadRequestOptions } from 'element-plus';
import { http } from '@/api/http';

const importing = ref(false);

async function downloadExport() {
  try {
    const { data } = await http.get<Blob>('/maintenance/backup/export', {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-system-backup-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('バックアップ ZIP をダウンロードしました');
  } catch (e: unknown) {
    console.error(e);
    const err = e as { response?: { data?: Blob }; message?: string };
    if (err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const j = JSON.parse(text) as { message?: string | string[] };
        const m = j.message;
        ElMessage.error(Array.isArray(m) ? m.join(', ') : m || 'エクスポートに失敗しました');
      } catch {
        ElMessage.error('エクスポートに失敗しました');
      }
    } else {
      ElMessage.error(err.message || 'エクスポートに失敗しました');
    }
  }
}

async function customUpload(options: UploadRequestOptions) {
  const raw = options.file as File | undefined;
  if (!raw) return;
  if (!String(raw.name).toLowerCase().endsWith('.zip')) {
    ElMessage.error('ZIP ファイルを選択してください');
    options.onError?.(new Error('not zip') as never);
    return;
  }
  importing.value = true;
  try {
    await ElMessageBox.confirm(
      '現在のデータベースと添付ファイルは、ZIP の内容で上書きされます。続行しますか？',
      'リストアの確認',
      { type: 'warning', confirmButtonText: '実行', cancelButtonText: 'キャンセル' },
    );
    const fd = new FormData();
    fd.append('file', raw);
    const { data } = await http.post<{ ok: boolean; message: string }>(
      '/maintenance/backup/import',
      fd,
    );
    ElMessage.success(data?.message || 'リストアが完了しました');
    options.onSuccess?.(data as never);
  } catch (e: unknown) {
    if (
      e === 'cancel' ||
      String(e) === 'cancel' ||
      (e as { action?: string }).action === 'cancel'
    ) {
      options.onError?.(new Error('cancelled') as never);
      return;
    }
    console.error(e);
    const err = e as {
      response?: { data?: { message?: string | string[] } };
      message?: string;
    };
    const m = err.response?.data?.message;
    ElMessage.error(Array.isArray(m) ? m.join(', ') : m || err.message || 'インポートに失敗しました');
    options.onError?.(e as never);
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <div class="page">
    <h1 class="title">バックアップ・リストア</h1>
    <p class="lead">
      SQLite データベースと添付（uploads）を ZIP にまとめて保存できます。リストアは管理者のみ、短時間 DB
      接続を切断します。
    </p>

    <el-card class="card" shadow="never">
      <template #header>
        <span class="card-head">エクスポート</span>
      </template>
      <p class="hint">ブラウザのダウンロードフォルダに ZIP が保存されます。安全な場所へ保管してください。</p>
      <el-button type="primary" @click="downloadExport">ZIP をダウンロード</el-button>
    </el-card>

    <el-card class="card" shadow="never">
      <template #header>
        <span class="card-head">リストア（インポート）</span>
      </template>
      <p class="hint warn">
        同一バージョンのアプリが作成した ZIP のみ対応します。実行中は他ユーザーの操作を止めてください。
      </p>
      <el-upload
        :show-file-list="true"
        :limit="1"
        accept=".zip"
        :http-request="customUpload"
        :disabled="importing"
      >
        <el-button type="danger" plain :loading="importing">ZIP を選択してリストア</el-button>
      </el-upload>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  max-width: 720px;
}

.title {
  margin: 0 0 8px;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--fs-ink, #1c1917);
}

.lead {
  margin: 0 0 20px;
  font-size: 0.9rem;
  line-height: 1.55;
  color: rgba(28, 25, 23, 0.72);
}

.card {
  margin-bottom: 16px;
  border-radius: 12px;
}

.card-head {
  font-weight: 600;
}

.hint {
  margin: 0 0 12px;
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(28, 25, 23, 0.65);
}

.hint.warn {
  color: #9a3412;
}
</style>
