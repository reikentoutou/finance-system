# 变更记录

本文件遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 风格，版本号与 [语义化版本](https://semver.org/lang/zh-CN/) 对齐（与 `apps/desktop` / 各包 `version` 协调发布）。

## [Unreleased]

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
