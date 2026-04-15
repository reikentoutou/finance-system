# 变更记录

本文件遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 风格，版本号与 [语义化版本](https://semver.org/lang/zh-CN/) 对齐（与 `apps/desktop` / 各包 `version` 协调发布）。

## [Unreleased]

### 改进

- **Web**：网管与管理员日报表单共用 `useReportAttachmentFiles`、`daily-report-form-sync`、`httpErrorMessage`；确认步骤抽为 `DailyReportConfirmSummary.vue`；输入主区域抽为 `DailyReportFormFields.vue`；`validateDailyReportGoToConfirm` / `validateDailyReportSubmit` 统一校验。加载/提交错误提示统一；移除调试用 `console.error`。管理员日报列表表格 `max-height` 内滚动以减轻长列表布局压力。
- **类型与运行时安全**：`apps/api/tsconfig.json` 启用 **`strict: true`**；`apps/web` 中 `localStorage` 用户 JSON 经 **`parseStoredUser`** 校验后再写入 Pinia；`env.d.ts` 为 **`vue-router` 的 `RouteMeta.role`** 声明类型，路由守卫不再断言。日报服务合并 `taxFreeCouponCounts` 时用 **`hasOwnProperty`** 分支替代非空断言 `!`。
- **打包脚本**：`scripts/serve-web.mjs` 对 **`decodeURIComponent` 非法序列** 返回 **400**，避免未捕获异常；`scripts/prepare-electron-bundled-resources.cjs` 在 **HTTP 非 200** 时 **删除不完整** 的 Node zip 临时文件。
- **注释**：`apps/web`、`apps/api` 源码及 `schema.prisma` 中面向开发者的注释统一为**简体中文**（界面/导出中的日文产品文案未改）。

### 文档

- **Cursor**：新增 `.cursor/rules/finance-agents-core.mdc`（全对话应用 AGENTS + API/Prisma 要点）、`vue-web-skills.mdc`（匹配 `apps/web/**` 时挂载 Vue skills 必读表）；AGENTS.md 已补充与上述规则的对应说明。
- **AGENTS.md**：AI 助手与协作者约定（改动范围、Prisma、Nest/Vue/桌面端、代码一致性）；含 **`.agents/skills`（vuejs-ai/skills）** 的用途、与本文优先级、`npx skills add`、Cursor `@` 引用及 `.agents/` 是否纳入 Git；**§3 API** 已写明 **`strict: true`** 与 `tsc` 验证。根 README 与 `docs/README` 已链到该文件。
- **README / API README**：README「开发与构建」补充 `schema.prisma` 变更后须 `db:generate`、Prisma Client 与 TS/IDE 不同步排查、**Cursor / VS Code** 下 **Vue - Official** 及**扩展市场失败时 VSIX 手动安装**；`docs/README.md` 索引链至上述小节；API README 生产检查表（JWT、CORS、db push）等见既有说明。

### 变更

- **Electron 主进程**：子进程异常退出时提示并退出；子进程环境变量改为「系统白名单 + 用户 `.env` 大写键」合并；`PORT` / `WEB_STATIC_PORT` 与健康检查、窗口 URL 对齐；端口冲突校验；首次创建 `.env` 时写入默认 `WEB_STATIC_PORT`。
- **prepare 脚本**：Node 官方 zip 下载重定向最多 5 次；解压仅保留 Windows `tar` 路径（去掉不可达分支）。

### 新增

- **Windows 桌面包自包含**：内置 Node、Nest API、Vue 静态页；客户 **双击 exe** 即可（无需系统 Node）。配置与数据默认 `%AppData%\FinanceSystem`。
- `prepare-electron-bundled-resources`：在 **Windows** 上生成 `resources-bundled` 并打入 NSIS / 便携 exe（`pnpm run pack:desktop:win` 等）。
- `pnpm run pack:bundle:win`（仅 Windows）：zip 内含自包含便携 exe + 说明。
- Prisma `binaryTargets` 含 `windows`；可交付桌面包仍须在 **Windows** 上 prepare（bcrypt 等）。
- Electron **portable** 与 NSIS 文件名区分（`*-Windows-Portable-*.exe`）。

### 计划中

- 按需补充：图标、自动更新、签名等。

## [0.0.4] - 2026-04-11

### 改进

- 桌面端：内置 API / 静态站输出写入 `%AppData%\FinanceSystem\api-startup.log`、`web-startup.log`，便于排查启动失败。
- 桌面端：按 `.env` 的 `PORT` 等待 API；进程在就绪前退出时立即报错，不再长时间空等。
- 桌面端：检测到单实例已运行时弹出提示，避免误以为「点击无反应」。

## [0.0.3] - 2026-04-11

### 修复

- GitHub Actions：移除 `pnpm/action-setup` 的 `version`，与根目录 `packageManager` 一致，避免 **Multiple versions of pnpm specified** 导致 Release 构建失败。

## [0.0.2] - 2026-04-11

### 修复

- Windows 上 `prepare-electron-bundled-resources` 的 `pnpm deploy` 改为与 `run()` 一致经 shell 调用，避免本机打包时 `pnpm deploy` 失败。

## [0.0.1] - 2026-04-11

### 新增

- 单体仓库：API、Web、Windows Electron 壳。
- 日报、集计、导出（管理员）；东京时区与四班次业务规则。
- GitHub Actions：标签 `v*` 触发 Windows NSIS 构建并上传 Release 资产。

[Unreleased]: https://github.com/reikentoutou/finance-system/compare/v0.0.4...HEAD
[0.0.4]: https://github.com/reikentoutou/finance-system/releases/tag/v0.0.4
[0.0.3]: https://github.com/reikentoutou/finance-system/releases/tag/v0.0.3
[0.0.2]: https://github.com/reikentoutou/finance-system/releases/tag/v0.0.2
[0.0.1]: https://github.com/reikentoutou/finance-system/releases/tag/v0.0.1
