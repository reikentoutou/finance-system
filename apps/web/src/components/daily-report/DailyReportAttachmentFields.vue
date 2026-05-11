<script setup lang="ts">
import { ref } from 'vue';
import ReportAttachmentPreview from '@/components/ReportAttachmentPreview.vue';
import { REPORT_TAX_FREE_ACCEPT } from '@/composables/useReportAttachmentFiles';
import DailyReportSection from './DailyReportSection.vue';

withDefaults(
  defineProps<{
    savedDdnPhotoKey: string | null;
    savedTaxFreePhotoKey: string | null;
    ddnFile: File | null;
    taxFile: File | null;
    photoAccept: string;
    taxFreePhotoAccept?: string;
  }>(),
  {
    taxFreePhotoAccept: REPORT_TAX_FREE_ACCEPT,
  },
);

defineEmits<{
  pickDdn: [e: Event];
  pickTax: [e: Event];
}>();

const ddnInputRef = ref<HTMLInputElement | null>(null);
const taxInputRef = ref<HTMLInputElement | null>(null);
</script>

<template>
  <DailyReportSection title="添付">
    <template #before-title>
      <ReportAttachmentPreview
        v-if="savedDdnPhotoKey || savedTaxFreePhotoKey"
        class="attachment-preview"
        :ddn-photo-key="savedDdnPhotoKey"
        :tax-free-card-photo-key="savedTaxFreePhotoKey"
      />
    </template>

    <el-form-item label="DDN（画像／PDF）" required class="item-plain">
      <div class="file-row">
        <input
          ref="ddnInputRef"
          type="file"
          class="visually-hidden"
          :accept="photoAccept"
          @change="$emit('pickDdn', $event)"
        />
        <el-button @click="ddnInputRef?.click()">ファイルを選択</el-button>
        <span class="file-name" :class="{ 'is-empty': !ddnFile }">{{ ddnFile?.name ?? '未選択（必須）' }}</span>
      </div>
    </el-form-item>
    <el-form-item label="10％クーポン（画像／PDF／TXT／Excel）" class="item-plain">
      <div class="file-row">
        <input
          ref="taxInputRef"
          type="file"
          class="visually-hidden"
          :accept="taxFreePhotoAccept"
          @change="$emit('pickTax', $event)"
        />
        <el-button @click="taxInputRef?.click()">ファイルを選択</el-button>
        <span class="file-name" :class="{ 'is-empty': !taxFile }">{{ taxFile?.name ?? '任意' }}</span>
      </div>
    </el-form-item>
  </DailyReportSection>
</template>

<style scoped>
.attachment-preview {
  margin-bottom: 16px;
}

.item-plain {
  margin-bottom: 16px;
}

.item-plain:last-child {
  margin-bottom: 0;
}

.item-plain :deep(.el-form-item__label) {
  font-weight: 600;
  color: var(--fs-ink, var(--el-text-color-primary));
}

.file-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.file-name {
  font-size: 13px;
  color: var(--fs-ink, var(--el-text-color-primary));
  word-break: break-all;
}

.file-name.is-empty {
  color: var(--fs-faint, var(--el-text-color-placeholder));
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
