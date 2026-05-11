<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <section class="block">
    <slot name="before-title" />
    <h3 class="block-title">{{ title }}</h3>
    <slot />
  </section>
</template>

<style scoped>
.block {
  padding: 18px 20px 20px;
  border: 1px solid var(--fs-border, var(--el-border-color));
  border-radius: var(--fs-radius-md, 10px);
  background: var(--fs-surface-elevated, var(--el-bg-color));
  box-shadow: var(--fs-shadow-soft, none);
}

.block-title {
  margin: 0 0 14px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fs-muted, var(--el-text-color-secondary));
}
</style>
