# @finance/web（Vue 3 前端）

财务系统 Web 端：登录、首启向导、网管日报四格、管理员日報/设置/集计与导出等。

**前台机交付（与根 README 一致）**：获取仓库源码、`pnpm install` 与配置 API 后，用根目录 **`pnpm run dev`**（或 `build` + `preview`）启动，**用系统浏览器访问**本前端；不必使用 `apps/desktop`。

## 开发

在**仓库根目录**安装依赖后：

```bash
pnpm run dev:web
```

默认与 Vite 开发服务器端口一致（常见为 `5173`）；全栈本地开发可用根目录 `pnpm run dev` 同时拉起 API 与 Web。

## 构建

```bash
pnpm run build:web
```

产物在 `apps/web/dist/`。

更多说明见根目录 **[README.md](../../README.md)**。
