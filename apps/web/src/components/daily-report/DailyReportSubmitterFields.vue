<script setup lang="ts">
import DailyReportSection from './DailyReportSection.vue';
import type { WebmasterOption } from './daily-report-form.types';

defineProps<{
  webmasters?: WebmasterOption[];
}>();

const createdByUserId = defineModel<string>('createdByUserId', {
  required: false,
});
</script>

<template>
  <DailyReportSection title="提出元">
    <el-form-item label="網管アカウント" class="item-plain">
      <el-select v-model="createdByUserId" class="field-wide" placeholder="選択">
        <el-option
          v-for="w in webmasters"
          :key="w.id"
          :label="w.username"
          :value="w.id"
        />
      </el-select>
    </el-form-item>
  </DailyReportSection>
</template>

<style scoped>
.item-plain {
  margin-bottom: 0;
}

.item-plain :deep(.el-form-item__label) {
  font-weight: 600;
  color: var(--fs-ink, var(--el-text-color-primary));
}

.field-wide {
  width: 100%;
  max-width: 360px;
}
</style>
