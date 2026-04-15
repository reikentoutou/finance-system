/// <reference types="vite/client" />

import 'vue-router';

declare module 'vue-router' {
  /** 受保护路由所需角色；与 `stores/auth` 的 `Role` 一致 */
  interface RouteMeta {
    role?: 'WEBMASTER' | 'ADMIN';
  }
}

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
