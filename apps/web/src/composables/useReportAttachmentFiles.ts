import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  isAllowedReportAttachmentFile,
  isAllowedTaxFreeReportAttachmentFile,
} from '@/utils/upload-url';

export const REPORT_PHOTO_ACCEPT = 'image/*,.pdf,application/pdf';

/** 10％クーポン添付（DDN より広い） */
export const REPORT_TAX_FREE_ACCEPT =
  'image/*,.pdf,.txt,.xlsx,.xls,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

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
    if (f && !isAllowedTaxFreeReportAttachmentFile(f)) {
      ElMessage.warning(
        '画像・PDF・テキスト（.txt）・Excel（.xlsx / .xls）のみ選択できます',
      );
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
