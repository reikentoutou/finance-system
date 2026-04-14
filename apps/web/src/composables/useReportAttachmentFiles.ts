import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { isAllowedReportAttachmentFile } from '@/utils/upload-url';

export const REPORT_PHOTO_ACCEPT = 'image/*,.pdf,application/pdf';

/** DDN / 免税券附件：共用 ref 与校验（网管与管理员日报共用） */
export function useReportAttachmentFiles() {
  const ddnFile = ref<File | null>(null);
  const taxFile = ref<File | null>(null);
  const savedDdnPhotoKey = ref<string | null>(null);
  const savedTaxFreePhotoKey = ref<string | null>(null);

  function onPickDdn(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    if (f && !isAllowedReportAttachmentFile(f)) {
      ElMessage.warning('画像または PDF のみ選択できます');
      input.value = '';
      ddnFile.value = null;
      return;
    }
    ddnFile.value = f;
  }

  function onPickTax(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    if (f && !isAllowedReportAttachmentFile(f)) {
      ElMessage.warning('画像または PDF のみ選択できます');
      input.value = '';
      taxFile.value = null;
      return;
    }
    taxFile.value = f;
  }

  function clearPickedFiles() {
    ddnFile.value = null;
    taxFile.value = null;
  }

  return {
    ddnFile,
    taxFile,
    savedDdnPhotoKey,
    savedTaxFreePhotoKey,
    onPickDdn,
    onPickTax,
    clearPickedFiles,
  };
}
