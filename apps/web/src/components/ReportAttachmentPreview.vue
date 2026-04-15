<script setup lang="ts">
import { computed } from 'vue';
import {
  resolveUploadedFileUrl,
  isPdfUploadUrl,
} from '@/utils/upload-url';

const props = defineProps<{
  ddnPhotoKey?: string | null;
  taxFreeCardPhotoKey?: string | null;
}>();

const ddnUrl = computed(() => resolveUploadedFileUrl(props.ddnPhotoKey));
const taxUrl = computed(() => resolveUploadedFileUrl(props.taxFreeCardPhotoKey));

const ddnIsPdf = computed(() => (ddnUrl.value ? isPdfUploadUrl(ddnUrl.value) : false));
const taxIsPdf = computed(() => (taxUrl.value ? isPdfUploadUrl(taxUrl.value) : false));
</script>

<template>
  <div v-if="ddnUrl || taxUrl" class="attach-wrap">
    <h4 class="attach-title">提出済み添付の確認</h4>
    <div class="attach-grid">
      <div v-if="ddnUrl" class="attach-cell">
        <div class="attach-label">DDN</div>
        <img v-if="!ddnIsPdf" :src="ddnUrl" alt="DDN" class="attach-img" />
        <div v-else class="attach-pdf">
          <el-link :href="ddnUrl" target="_blank" rel="noopener" type="primary">
            PDF を別タブで開く
          </el-link>
          <iframe :src="ddnUrl" class="attach-iframe" title="DDN PDF" />
        </div>
      </div>
      <div v-if="taxUrl" class="attach-cell">
        <div class="attach-label">10％クーポン</div>
        <img v-if="!taxIsPdf" :src="taxUrl" alt="10% coupon" class="attach-img" />
        <div v-else class="attach-pdf">
          <el-link :href="taxUrl" target="_blank" rel="noopener" type="primary">
            PDF を別タブで開く
          </el-link>
          <iframe :src="taxUrl" class="attach-iframe" title="Coupon PDF" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.attach-wrap {
  margin-bottom: 20px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}
.attach-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}
.attach-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.attach-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}
.attach-img {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--fs-surface-elevated);
}
.attach-pdf {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.attach-iframe {
  width: 100%;
  min-height: 280px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  background: var(--fs-surface);
}
</style>
