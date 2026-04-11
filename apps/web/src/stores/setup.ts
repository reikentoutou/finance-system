import { defineStore } from 'pinia';
import { ref } from 'vue';
import { http } from '@/api/http';

export const useSetupStore = defineStore('setup', () => {
  const setupCompleted = ref<boolean | null>(null);

  async function fetchStatus() {
    const { data } = await http.get<{ setupCompleted: boolean }>('/setup/status');
    setupCompleted.value = data.setupCompleted;
    return data.setupCompleted;
  }

  return { setupCompleted, fetchStatus };
});
