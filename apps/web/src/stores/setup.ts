import { defineStore } from 'pinia';
import { ref } from 'vue';
import { http } from '@/api/http';

/** 成功取得 setup 状态后的短缓存，减轻路由守卫对 /setup/status 的重复请求 */
const STATUS_TTL_MS = 30_000;
let statusSuccessCachedAt = 0;

export const useSetupStore = defineStore('setup', () => {
  const setupCompleted = ref<boolean | null>(null);
  /** 最近一次拉取 /setup/status 是否因网络等原因失败 */
  const statusFetchFailed = ref(false);

  /**
   * @param force 为 true 时跳过短缓存（如 bootstrap 后、服务恢复重试）
   */
  async function fetchStatus(force = false): Promise<boolean | null> {
    if (
      !force &&
      setupCompleted.value !== null &&
      !statusFetchFailed.value &&
      statusSuccessCachedAt > 0 &&
      Date.now() - statusSuccessCachedAt < STATUS_TTL_MS
    ) {
      return setupCompleted.value;
    }

    statusFetchFailed.value = false;
    try {
      const { data } = await http.get<{ setupCompleted: boolean }>('/setup/status');
      setupCompleted.value = data.setupCompleted;
      statusSuccessCachedAt = Date.now();
      return data.setupCompleted;
    } catch {
      statusFetchFailed.value = true;
      setupCompleted.value = null;
      statusSuccessCachedAt = 0;
      return null;
    }
  }

  /** 登出或需强制重新探测 setup 时调用 */
  function resetSetupCache() {
    setupCompleted.value = null;
    statusFetchFailed.value = false;
    statusSuccessCachedAt = 0;
  }

  return { setupCompleted, statusFetchFailed, fetchStatus, resetSetupCache };
});
